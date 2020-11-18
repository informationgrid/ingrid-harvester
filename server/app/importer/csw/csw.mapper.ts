/**
 * A mapper for ISO-XML documents harvested over CSW.
 */
import {Agent, DateRange, Distribution, GenericMapper, Organization, Person} from "../../model/generic.mapper";
import {License} from '@shared/license.model';
import {getLogger} from "log4js";
import {UrlUtils} from "../../utils/url.utils";
import {RequestDelegate} from "../../utils/http-request.utils";
import {CswSummary} from "./csw.importer";
import {OptionsWithUri} from "request-promise";
import {CswSettings} from './csw.settings';
import {throwError} from "rxjs";
import doc = Mocha.reporters.doc;
import {ImporterSettings} from "../../importer.settings";
import {DcatPeriodicityUtils} from "../../utils/dcat.periodicity.utils";
import {DcatLicensesUtils} from "../../utils/dcat.licenses.utils";

let xpath = require('xpath');

export class CswMapper extends GenericMapper {

    static GMD = 'http://www.isotc211.org/2005/gmd';
    static GCO = 'http://www.isotc211.org/2005/gco';
    static GML = 'http://www.opengis.net/gml';
    static CSW = 'http://www.opengis.net/cat/csw/2.0.2';
    static SRV = 'http://www.isotc211.org/2005/srv';

    static select = xpath.useNamespaces({
        'gmd': CswMapper.GMD,
        'gco': CswMapper.GCO,
        'gml': CswMapper.GML,
        'srv': CswMapper.SRV
    });

    private log = getLogger();

    private readonly record: any;
    private harvestTime: any;
    private readonly storedData: any;

    protected readonly idInfo; // : SelectedValue;
    private settings: CswSettings;
    private readonly uuid: string;
    private summary: CswSummary;

    private keywordsAlreadyFetched = false;
    private fetched: any = {
        contactPoint: null,
        keywords: {},
        themes: null
    };


    constructor(settings, record, harvestTime, storedData, summary) {
        super();
        this.settings = settings;
        this.record = record;
        this.harvestTime = harvestTime;
        this.storedData = storedData;
        this.summary = summary;

        this.uuid = CswMapper.getCharacterStringContent(record, 'fileIdentifier');

        this.idInfo = CswMapper.select('./gmd:identificationInfo', record, true);

    }

    protected getSettings(): ImporterSettings {
        return this.settings;
    }

    getDescription() {
        let abstract = CswMapper.getCharacterStringContent(this.idInfo, 'abstract');
        if (!abstract) {
            let msg = `Dataset doesn't have an abstract. It will not be displayed in the portal. Id: \'${this.uuid}\', title: \'${this.getTitle()}\', source: \'${this.settings.getRecordsUrl}\'`;
            this.log.warn(msg);
            this.summary.warnings.push(['No description', msg]);
            this.valid = false;
        }

        return abstract;
    }


    async getDistributions(): Promise<Distribution[]> {
        let dists = [];
        let urlsFound = [];

        let srvIdent = CswMapper.select('./srv:SV_ServiceIdentification', this.idInfo, true);
        if (srvIdent) {
            dists = await this.handleDistributionforService(srvIdent, urlsFound);
        }

        let distNodes = CswMapper.select('./gmd:distributionInfo/gmd:MD_Distribution', this.record);
        for (let i = 0; i < distNodes.length; i++) {
            let distNode = distNodes[i];
            let id = distNode.getAttribute('id');
            if (!id) id = distNode.getAttribute('uuid');

            let formats = [];
            let urls: Distribution[] = [];

            CswMapper.select('.//gmd:MD_Format/gmd:name/gco:CharacterString', distNode).forEach(format => {
                format.textContent.split(',').forEach(formatItem => {
                    if (!formats.includes(formatItem)) {
                        formats.push(formatItem.trim());
                    }
                });
            });

            // Combine formats in a single slash-separated string
            if (formats.length === 0) formats.push('Unbekannt');

            let onlineResources = CswMapper.select('.//gmd:MD_DigitalTransferOptions/gmd:onLine/gmd:CI_OnlineResource', distNode);
            for (let j = 0; j < onlineResources.length; j++) {
                let onlineResource = onlineResources[j];

                let urlNode = CswMapper.select('gmd:linkage/gmd:URL', onlineResource);
                let title = CswMapper.select('gmd:name/gco:CharacterString', onlineResource);
                let protocolNode = CswMapper.select('gmd:protocol/gco:CharacterString', onlineResource);

                let url = null;
                if (urlNode.length > 0) {
                    let requestConfig = this.getUrlCheckRequestConfig(urlNode[0].textContent);
                    url = await UrlUtils.urlWithProtocolFor(requestConfig);
                }
                if (url && !urls.includes(url)) {
                    const formatArray = protocolNode.length > 0 && protocolNode[0].textContent
                        ? [protocolNode[0].textContent]
                        : formats;

                    urls.push({
                        accessURL: url,
                        title: title.length > 0 ? title[0].textContent : undefined,
                        format: UrlUtils.mapFormat(formatArray, this.summary.warnings)
                    });
                }
            }

            // Filter out URLs that have already been found
            urls = urls.filter(item => !urlsFound.includes(item.accessURL));

            // Set id only if there is a single resource
            if (urls.length === 1 && id) urls[0].id = id;

            // add distributions to all
            dists.push(...urls);
        }

        if (dists.length === 0) {
            let msg = `Dataset has no links for download/access. It will not be displayed in the portal. Id: \'${this.uuid}\', source: \'${this.settings.getRecordsUrl}\'`;
            this.summary.missingLinks++;
            this.log.warn(msg);

            this.valid = false;
            this.summary.warnings.push(['No links', msg]);
        }

        return dists;
    }

    async handleDistributionforService(srvIdent, urlsFound): Promise<Distribution[]> {

        let getCapabilitiesElement = CswMapper.select(
            // convert containing text to lower case
            './srv:containsOperations/srv:SV_OperationMetadata[./srv:operationName/gco:CharacterString/text()[contains(translate(\'GetCapabilities\', \'ABCEGILPST\', \'abcegilpst\'), "getcapabilities")]]/srv:connectPoint/*/gmd:linkage/gmd:URL',
            srvIdent,
            true);
        let getCapablitiesUrl = getCapabilitiesElement ? getCapabilitiesElement.textContent : null;
        let serviceFormat = CswMapper.select('.//srv:serviceType/gco:LocalName', srvIdent, true);
        let serviceTypeVersion = CswMapper.select('.//srv:serviceTypeVersion/gco:CharacterString', srvIdent);
        let serviceLinks: Distribution[] = [];

        if(serviceFormat){
            serviceFormat = serviceFormat.textContent;
        }

        if (getCapablitiesUrl) {
            let lowercase = getCapablitiesUrl.toLowerCase();
            if (lowercase.match(/\bwms\b/)) serviceFormat = 'WMS';
            if (lowercase.match(/\bwfs\b/)) serviceFormat = 'WFS';
            if (lowercase.match(/\bwcs\b/)) serviceFormat = 'WCS';
            if (lowercase.match(/\bwmts\b/)) serviceFormat = 'WMTS';
        }

        if (serviceTypeVersion) {
            for(let i = 0; i < serviceTypeVersion.length; i++) {
                let lowercase = serviceTypeVersion[i].textContent.toLowerCase();
                if (lowercase.match(/\bwms\b/)) serviceFormat = 'WMS';
                if (lowercase.match(/\bwfs\b/)) serviceFormat = 'WFS';
                if (lowercase.match(/\bwcs\b/)) serviceFormat = 'WCS';
                if (lowercase.match(/\bwmts\b/)) serviceFormat = 'WMTS';
            }
        }


        let operations = CswMapper
            .select('./srv:containsOperations/srv:SV_OperationMetadata', srvIdent);

        for (let i = 0; i < operations.length; i++) {
            let onlineResource = CswMapper.select('./srv:connectPoint/gmd:CI_OnlineResource', operations[i], true);

            if(onlineResource) {
                let urlNode = CswMapper.select('gmd:linkage/gmd:URL', onlineResource, true);
                let protocolNode = CswMapper.select('gmd:protocol/gco:CharacterString', onlineResource, true);

                let title = this.getTitle();

                let operationNameNode = CswMapper.select('srv:operationName/gco:CharacterString', operations[i], true);
                if(operationNameNode){
                    title = title + " - " + operationNameNode.textContent;
                }

                let requestConfig = this.getUrlCheckRequestConfig(urlNode.textContent);
                let url = await UrlUtils.urlWithProtocolFor(requestConfig);
                if (url && !urlsFound.includes(url)) {
                    serviceLinks.push({
                        accessURL: url,
                        format: [protocolNode ? protocolNode.textContent : serviceFormat],
                        title: (title && title.length > 0) ? title : undefined
                    });
                    urlsFound.push(url);
                }
            }
        }

        return serviceLinks;

    }

    async getPublisher(): Promise<any[]> {
        let publishers = [];
        // Look up contacts for the dataset first and then the metadata contact
        let queries = [
            './gmd:identificationInfo/*/gmd:pointOfContact/gmd:CI_ResponsibleParty',
            './gmd:contact/gmd:CI_ResponsibleParty'
        ];
        for (let i = 0; i < queries.length; i++) {
            let contacts = CswMapper.select(queries[i], this.record);
            for (let j = 0; j < contacts.length; j++) {
                let contact = contacts[j];
                let role = CswMapper.select('./gmd:role/gmd:CI_RoleCode/@codeListValue', contact, true).textContent;

                let name = CswMapper.select('./gmd:individualName/gco:CharacterString', contact, true);
                let org = CswMapper.select('./gmd:organisationName/gco:CharacterString', contact, true);
                let urlNode = CswMapper.select('./gmd:contactInfo/*/gmd:onlineResource/*/gmd:linkage/gmd:URL', contact, true);

                let url = null;
                if (urlNode) {
                    let requestConfig = this.getUrlCheckRequestConfig(urlNode.textContent);
                    url = await UrlUtils.urlWithProtocolFor(requestConfig);
                }

                if (role === 'publisher') {
                    let infos: any = {};

                    if (name) infos.name = name.textContent;
                    if (url) infos.homepage = url;
                    if (org) infos.organization = org.textContent;

                    publishers.push(infos);
                }
            }
        }

        if (publishers.length === 0) {
            this.summary.missingPublishers++;
            return undefined;
        } else {
            return publishers;
        }
    }

    getTitle() {
        let title = CswMapper.getCharacterStringContent(this.idInfo, 'title');
        return title && title.trim() !== '' ? title : undefined;
    }

    /**
     * For Open Data, GDI-DE expects access rights to be defined three times:
     * - As text in useLimitation
     * - As text in a useConstraints/otherConstraints combination
     * - As a JSON-snippet in a useConstraints/otherConstraints combination
     *
     * Use limitations can also be defined as separate fields
     * Plus access constraints can be set from the ISO codelist MD_RestrictionCode
     *
     * GeoDCAT-AP of the EU on the other had uses the
     * useLimitation/accessConstraints=otherRestritions/otherConstraints
     * combination and uses the accessRights field to store this information.
     *
     * We use a combination of these strategies:
     * - Use the accessRights field like GeoDCAT-AP but store:
     *    + all the useLimitation items
     *    + all otherConstraints texts for useConstraints/otherConstraints
     *      combinations that are not JSON-snippets.
     */
    getAccessRights(): string[] {
        // Extract all useLimitation texts
        let limitations = CswMapper.select('./*/gmd:resourceConstraints/*/gmd:useLimitation', this.idInfo)
            .map(node => CswMapper.getCharacterStringContent(node)) // Extract the text
            .filter(text => text) // Filter out falsy items
            .map(text => text.trim());

        // Select 'otherConstraints' elements that have a 'useConstraints' sibling
        let constraints = CswMapper.select('./*/gmd:resourceConstraints/*[./gmd:useConstraints and ./gmd:otherConstraints]/gmd:otherConstraints', this.idInfo)
            .map(node => CswMapper.getCharacterStringContent(node)) // Extract the text
            .filter(text => text) // Filter out null and undefined values
            .map(text => text.trim())
            .filter(text => text && !limitations.includes(text.trim()) && !text.match(/"url"\s*:\s*"([^"]+)"/)); // Keep non-empty (truthy) items that are not defined in useLimitations and are not a JSON-snippet

        // Combine useLimitations and otherConstraints and store in accessRights
        let accessRights = limitations.concat(constraints);
        if (accessRights.length > 0) {
            return accessRights;
        }
        return undefined;
    }

    getCategories(): string[] {
        let subgroups = [];
        let keywords = this.getKeywords();
        if (keywords) {
            keywords.forEach(k => {
                k = k.trim();
                if (k === 'mcloud_category_roads' || k === 'mcloud-kategorie-straßen') subgroups.push('roads');
                if (k === 'mcloud_category_climate' || k === 'mcloud-kategorie-klima-und-wetter') subgroups.push('climate');
                if (k === 'mcloud_category_waters' || k === 'mcloud-kategorie-wasserstraßen-und-gewässer') subgroups.push('waters');
                if (k === 'mcloud_category_railway' || k === 'mcloud-kategorie-bahn') subgroups.push('railway');
                if (k === 'mcloud_category_infrastructure' || k === 'mcloud-kategorie-infrastuktur') subgroups.push('infrastructure');
                if (k === 'mcloud_category_aviation' || k === 'mcloud-kategorie-luft--und-raumfahrt') subgroups.push('aviation');
            });
        }
        if (subgroups.length === 0) subgroups.push(...this.settings.defaultMcloudSubgroup);
        return subgroups;
    }

    getCitation(): string {
        return undefined;
    }

    async getDisplayContacts() {

        let contactPoint = await this.getContactPoint();
        let displayContact: Person;

        if (contactPoint) {
            let displayName;

            if (contactPoint['organization-name']) {
                displayName = contactPoint['organization-name'];
            } else if (contactPoint.fn) {
                displayName = contactPoint.fn;
            }

            displayContact = {
                name: displayName,
                homepage: contactPoint.hasURL
            };
        } else {
            let publisher = await this.getPublisher();

            if (publisher) {
                let displayName;

                if (publisher[0].organization) {
                    displayName = publisher[0].organization;
                } else if (publisher[0].name) {
                    displayName = publisher[0].name;
                }

                displayContact = {
                    name: displayName.trim(),
                    homepage: publisher[0].homepage
                };
            } else {
                let creator = this.getCreator();

                displayContact = {
                    name: creator[0].name.trim(),
                    homepage: creator[0].homepage
                };
            }
        }
        return [displayContact];
    }

    getGeneratedId(): string {
        return this.uuid;
    }

    /**
     * Extracts and returns an array of keywords defined in the ISO-XML document.
     * This method also checks if these keywords contain at least one of the
     * given mandatory keywords. If this is not the case, then the mapped
     * document is flagged to be skipped from the index. By default this array
     * contains just one entry 'opendata' i.e. if the ISO-XML document doesn't
     * have this keyword defined, then it will be skipped from the index.
     */
    getKeywords(): string[] {
        let mandatoryKws = this.settings.eitherKeywords || [];
        let keywords = this.fetched.keywords[mandatoryKws.join()];
        if (keywords) {
            return keywords;
        }

        keywords = [];
        CswMapper.select('.//gmd:descriptiveKeywords/*/gmd:keyword/gco:CharacterString', this.record).forEach(node => {
            keywords.push(node.textContent);
        });

        /*
         * Check keywords. Mark datasets as valid only if:
         * - there are no mandatory keywords OR
         * - at least one of the mandatory keywords is present
         */
        let valid = mandatoryKws.length === 0;
        valid = valid || keywords.reduce((accumulator, currentValue) => {
            return accumulator || mandatoryKws.includes(currentValue);
        }, false);
        if (!valid) {
            // Don't index metadata-sets without any of the mandatory keywords
            this.log.info(`None of the mandatory keywords ${JSON.stringify(mandatoryKws)} found. Item will be ignored. ID: '${this.uuid}', Title: '${this.getTitle()}', Source: '${this.settings.getRecordsUrl}'.`);
            this.skipped = true;
        }

        // Update the statistics
        if (!this.keywordsAlreadyFetched && valid) {
            this.summary.opendata++;
        }

        this.keywordsAlreadyFetched = true;

        this.fetched.keywords[mandatoryKws.join()] = keywords;
        return keywords;
    }


    getMFundFKZ(): string {
        // Detect mFund properties
        let keywords = this.getKeywords();
        if (keywords) {
            let fkzKeyword = keywords.find(kw => kw.toLowerCase().startsWith('mfund-fkz:'));

            if (fkzKeyword) {
                let idx = fkzKeyword.indexOf(':');
                let fkz = fkzKeyword.substr(idx + 1);

                if (fkz) return fkz.trim();
            }
        }
        return undefined;
    }

    getMFundProjectTitle(): string {
        // Detect mFund properties
        let keywords = this.getKeywords();
        if (keywords) {
            let mfKeyword: string = keywords.find(kw => kw.toLowerCase().startsWith('mfund-projekt:'));

            if (mfKeyword) {
                let idx = mfKeyword.indexOf(':');
                let mfName = mfKeyword.substr(idx + 1);

                if (mfName) return mfName.trim();
            }
        }
        return undefined;
    }

    getMetadataIssued(): Date {
        return this.storedData.issued ? new Date(this.storedData.issued) : new Date(Date.now());
    }

    getMetadataModified(): Date {
        if(this.storedData.modified && this.storedData.dataset_modified){
            let storedDataset_modified: Date = new Date(this.storedData.dataset_modified);
            if(storedDataset_modified.valueOf() === this.getModifiedDate().valueOf()  )
                return new Date(this.storedData.modified);
        }
        return new Date(Date.now());
    }

    getMetadataSource(): any {
        let gmdEncoded = encodeURIComponent(CswMapper.GMD);
        let cswLink = `${this.settings.getRecordsUrl}?REQUEST=GetRecordById&SERVICE=CSW&VERSION=2.0.2&ElementSetName=full&outputFormat=application/xml&outputSchema=${gmdEncoded}&Id=${this.uuid}`;
        return {
            raw_data_source: cswLink,
            portal_link: this.settings.defaultAttributionLink,
            attribution: this.settings.defaultAttribution
        };
    }

    getModifiedDate() {
        return new Date(CswMapper.select('./gmd:dateStamp/gco:Date|./gmd:dateStamp/gco:DateTime', this.record, true).textContent);
    }

    getSpatial(): any {
        let geographicBoundingBoxes = CswMapper.select('(./srv:SV_ServiceIdentification/srv:extent|./gmd:MD_DataIdentification/gmd:extent)/gmd:EX_Extent/gmd:geographicElement/gmd:EX_GeographicBoundingBox', this.idInfo);
        let geometries = [];
        for(let i=0; i < geographicBoundingBoxes.length; i++){
            let geographicBoundingBox = geographicBoundingBoxes[i];
            let west = parseFloat(CswMapper.select('./gmd:westBoundLongitude', geographicBoundingBox, true).textContent.trimLeft().trim());
            let east = parseFloat(CswMapper.select('./gmd:eastBoundLongitude', geographicBoundingBox, true).textContent.trimLeft().trim());
            let south = parseFloat(CswMapper.select('./gmd:southBoundLatitude', geographicBoundingBox, true).textContent.trimLeft().trim());
            let north = parseFloat(CswMapper.select('./gmd:northBoundLatitude', geographicBoundingBox, true).textContent.trimLeft().trim());

            if (west === east && north === south) {
                geometries.push({
                    'type': 'point',
                    'coordinates': [west, north]
                });
            } else if (west === east || north === south) {
                geometries.push({
                    'type': 'linestring',
                    'coordinates': [[west, north], [east, south]]
                });
            } else {
                geometries.push({
                    'type': 'envelope',
                    'coordinates': [[west, north], [east, south]]
                });
            }
        }
        if(geometries.length == 1){
            return geometries[0];
        }
        else if(geometries.length > 1){
            return {
                'type': 'geometrycollection',
                'geometries' : geometries
            }
        }

        return undefined;
    }

    getSpatialText(): string {
        let geoGraphicDescriptions = CswMapper.select('(./srv:SV_ServiceIdentification/srv:extent|./gmd:MD_DataIdentification/gmd:extent)/gmd:EX_Extent/gmd:geographicElement/gmd:EX_GeographicDescription', this.idInfo);
        let result = [];
        for(let i=0; i < geoGraphicDescriptions.length; i++)
        {
            let geoGraphicDescription = geoGraphicDescriptions[i];
            let geoGraphicCode = CswMapper.select('./gmd:geographicIdentifier/gmd:MD_Identifier/gmd:code/gco:CharacterString', geoGraphicDescription, true);
            if(geoGraphicCode)
                result.push(geoGraphicCode.textContent);
        }

        if(result){
            return result.join(", ");
        }

        return undefined;
    }

    getTemporal(): DateRange[] {
        let suffix = this.getErrorSuffix(this.uuid, this.getTitle());

        let result: DateRange[] = [];

        let nodes = CswMapper.select('./*/gmd:extent/*/gmd:temporalElement/*/gmd:extent//gml:TimePeriod', this.idInfo);

        for (let i = 0; i < nodes.length; i++) {
            let begin = this.getTimeValue(nodes[i], 'begin');
            let end = this.getTimeValue(nodes[i], 'end');

            if (begin || end) {
                result.push({
                    gte: begin ? begin : undefined,
                    lte: end ? end : undefined
                });
            }
        }
        nodes = CswMapper.select('./*/gmd:extent/*/gmd:temporalElement/*/gmd:extent//gml:TimeInstant/gml:timePosition', this.idInfo);

        let times = nodes.map(node => node.textContent);
        for (let i = 0; i < times.length; i++) {
            result.push({
                gte: new Date(times[i]),
                lte: new Date(times[i])
            });
        }

        if(result.length)
            return result;

        return undefined;
    }

    getTimeValue(node, beginOrEnd: 'begin' | 'end'): Date {
        let dateNode = CswMapper.select('./gml:' + beginOrEnd + 'Position', node, true);
        if (!dateNode) {
            dateNode = CswMapper.select('./gml:' + beginOrEnd + '/*/gml:timePosition', node, true);
        }
        try {
            if (!dateNode.hasAttribute('indeterminatePosition')) {
                let text = dateNode.textContent;
                let date = new Date(Date.parse(text));
                if (date) {
                    return date;
                } else {
                    this.log.warn(`Error parsing begin date, which was '${text}'. It will be ignored.`);
                }
            }
        } catch (e) {
            this.log.error(`Cannot extract time range.`, e);
        }
    }

    getThemes() {
        // Return cached value, if present
        if (this.fetched.themes) return this.fetched.themes;

        // Evaluate the themes
        let xpath = './/gmd:descriptiveKeywords/gmd:MD_Keywords[./gmd:thesaurusName/gmd:CI_Citation/gmd:title/gco:CharacterString/text()="Data theme (EU MDR)"]/gmd:keyword/gco:CharacterString';
        let themes = CswMapper.select(xpath, this.record)
            .map(node => CswMapper.dcatThemeUriFromKeyword(node.textContent))
            .filter(theme => theme); // Filter out falsy values

        if (!themes || themes.length === 0) {
            // Fall back to default value
            themes = this.settings.defaultDCATCategory
                .map(category => GenericMapper.DCAT_CATEGORY_URL + category);
        }

        this.fetched.themes = themes;
        return themes;
    }

    isRealtime(): boolean {
        return undefined;
    }

    static getCharacterStringContent(element, cname?): string {
        if (cname) {
            let node = CswMapper.select(`.//gmd:${cname}/gco:CharacterString`, element, true);
            if (node) {
                return node.textContent;
            }
        } else {
            let node = CswMapper.select('./gco:CharacterString', element, true);
            return node ? node.textContent : null;
        }
    }

    getAccrualPeriodicity(): string {
        // Multiple resourceMaintenance elements are allowed. If present, use the first one
        let freq = CswMapper.select('./*/gmd:resourceMaintenance/*/gmd:maintenanceAndUpdateFrequency/gmd:MD_MaintenanceFrequencyCode', this.idInfo);
        if (freq.length > 0) {
            let periodicity = DcatPeriodicityUtils.getPeriodicity(freq[0].getAttribute('codeListValue'))
            if(!periodicity){
                this.summary.warnings.push(["Unbekannte Periodizität", freq[0].getAttribute('codeListValue')]);
            }
            return periodicity;
        }
        return undefined;
    }

    async getLicense() {
        let license: License;
        let constraints = CswMapper.select('./*/gmd:resourceConstraints/*[./gmd:useConstraints/gmd:MD_RestrictionCode/@codeListValue="license" or ./gmd:useConstraints/gmd:MD_RestrictionCode/@codeListValue="otherRestrictions"]', this.idInfo);

        if (constraints && constraints.length > 0) {
            for (let j = 0; j < constraints.length; j++) {
                let c = constraints[j];
                let nodes = CswMapper.select('./gmd:otherConstraints', c);
                for (let i = 0; i < nodes.length; i++) {
                    let text = CswMapper.getCharacterStringContent(nodes[i]);
                    try {
                        let json = JSON.parse(text);

                        if (!json.id || !json.url) continue;

                        license = await DcatLicensesUtils.get(json.url);
                        if (!license) {
                            let requestConfig = this.getUrlCheckRequestConfig(json.url);
                            license = {
                                id: json.id,
                                title: json.name,
                                url: await UrlUtils.urlWithProtocolFor(requestConfig)
                            };
                        }
                    } catch (ignored) {
                    }
                }
            }
        }

        if (!license) {
            let msg = `No license detected for dataset. ${this.getErrorSuffix(this.uuid, this.getTitle())}`;
            this.summary.missingLicense++;

            this.log.warn(msg);
            this.summary.warnings.push(['Missing license', msg]);
            return {
                id: 'unknown',
                title: 'Unbekannt',
                url: undefined
            };
        }

        return license;
    }

    getErrorSuffix(uuid, title) {
        return `Id: '${uuid}', title: '${title}', source: '${this.settings.getRecordsUrl}'.`;
    }

    getHarvestedData(): string {
        return this.record.toString();
    }

    getCreator(): Person[] {
        let creators = [];
        // Look up contacts for the dataset first and then the metadata contact
        let queries = [
            './gmd:identificationInfo/*/gmd:pointOfContact/gmd:CI_ResponsibleParty',
            './gmd:contact/gmd:CI_ResponsibleParty'
        ];
        for (let i = 0; i < queries.length; i++) {
            let contacts = CswMapper.select(queries[i], this.record);
            for (let j = 0; j < contacts.length; j++) {
                let contact = contacts[j];
                let role = CswMapper.select('./gmd:role/gmd:CI_RoleCode/@codeListValue', contact, true).textContent;

                let name = CswMapper.select('./gmd:individualName/gco:CharacterString', contact, true);
                let organisation = CswMapper.select('./gmd:organisationName/gco:CharacterString', contact, true);
                let email = CswMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:electronicMailAddress/gco:CharacterString', contact, true);

                if (role === 'originator' || role === 'author') {
                    let creator: creatorType = {};
                    /*
                     * Creator has only one field for name. Use either the name
                     * of the organisation or the person for this field. The
                     * organisation name has a higher priority.
                     */
                    if (organisation) {
                        creator.name = organisation.textContent;
                    } else if (name) {
                        creator.name = name.textContent;
                    }
                    if (email) creator.mbox = email.textContent;

                    let alreadyPresent = creators.filter(c => c.name === creator.name && c.mbox === creator.mbox).length > 0;
                    if (!alreadyPresent) {
                        creators.push(creator);
                    }
                }
            }
        }
        return creators.length === 0 ? undefined : creators;
    }


    getGroups(): string[] {
        return undefined;
    }

    getIssued(): Date {
        return undefined;
    }

    getMetadataHarvested(): Date {
        return new Date(Date.now());
    }

    getSubSections(): any[] {
        return undefined;
    }

    getOriginator(): Person[] {

        let originators: any[] = [];

        let queries = [
            './gmd:identificationInfo/*/gmd:pointOfContact/gmd:CI_ResponsibleParty',
            './gmd:contact/gmd:CI_ResponsibleParty'
        ];
        for (let i = 0; i < queries.length; i++) {
            let contacts = CswMapper.select(queries[i], this.record);
            for (let j = 0; j < contacts.length; j++) {
                let contact = contacts[j];
                let role = CswMapper.select('./gmd:role/gmd:CI_RoleCode/@codeListValue', contact, true).textContent;

                if (role === 'originator') {
                    let name = CswMapper.select('./gmd:individualName/gco:CharacterString', contact, true);
                    let org = CswMapper.select('./gmd:organisationName/gco:CharacterString', contact, true);
                    let email = CswMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:electronicMailAddress/gco:CharacterString', contact, true);
                    let url = CswMapper.select('./gmd:contactInfo/*/gmd:onlineResource/*/gmd:linkage/gmd:URL', contact, true);

                    if (!name && !org) continue;

                    let originator: Agent = {
                        homepage: url ? url.textContent : undefined,
                        mbox: email ? email.textContent : undefined
                    };
                    if (name) {
                        (<Person>originator).name = name.textContent
                    } else {
                        (<Organization>originator).organization = org.textContent
                    }

                    let alreadyPresent = originators.filter(other => {
                        return other.name === (<Person>originator).name
                            && other.organization === (<Organization>originator).organization
                            && other.mbox === originator.mbox
                            && other.homepage === originator.homepage;
                    }).length > 0;
                    if (!alreadyPresent) {
                        originators.push(originator);
                    }
                }
            }
        }

        return originators.length > 0 ? originators : undefined;
    }

    async getContactPoint(): Promise<any> {

        let contactPoint = this.fetched.contactPoint;
        if (contactPoint) {
            return contactPoint;
        }

        let others = [];
        // Look up contacts for the dataset first and then the metadata contact
        let queries = [
            './gmd:identificationInfo/*/gmd:pointOfContact/gmd:CI_ResponsibleParty',
            './gmd:contact/gmd:CI_ResponsibleParty'
        ];
        for (let i = 0; i < queries.length; i++) {
            let contacts = CswMapper.select(queries[i], this.record);
            for (let j = 0; j < contacts.length; j++) {
                let contact = contacts[j];
                let role = CswMapper.select('./gmd:role/gmd:CI_RoleCode/@codeListValue', contact, true).textContent;

                if (role !== 'originator' && role !== 'author' && role !== 'publisher') {
                    let name = CswMapper.select('./gmd:individualName/gco:CharacterString', contact, true);
                    let org = CswMapper.select('./gmd:organisationName/gco:CharacterString', contact, true);
                    let delPt = CswMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:deliveryPoint', contact);
                    let region = CswMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:administrativeArea/gco:CharacterString', contact, true);
                    let country = CswMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:country/gco:CharacterString', contact, true);
                    let postCode = CswMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:postalCode/gco:CharacterString', contact, true);
                    let email = CswMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:electronicMailAddress/gco:CharacterString', contact, true);
                    let phone = CswMapper.select('./gmd:contactInfo/*/gmd:phone/*/gmd:voice/gco:CharacterString', contact, true);
                    let urlNode = CswMapper.select('./gmd:contactInfo/*/gmd:onlineResource/*/gmd:linkage/gmd:URL', contact, true);
                    let url = null;
                    if (urlNode) {
                        let requestConfig = this.getUrlCheckRequestConfig(urlNode.textContent);
                        url = await UrlUtils.urlWithProtocolFor(requestConfig);
                    }

                    let infos: any = {};

                    if (contact.getAttribute('uuid')) {
                        infos.hasUID = contact.getAttribute('uuid');
                    }

                    if (name) infos.fn = name.textContent;
                    if (org) infos['organization-name'] = org.textContent;

                    let line1 = delPt.map(n => CswMapper.getCharacterStringContent(n));
                    line1 = line1.join(', ');
                    if (line1) infos['street-address'] = line1;

                    if (region) infos.region = region.textContent;
                    if (country) infos['country-name'] = country.textContent;
                    if (postCode) infos['postal-code'] = postCode.textContent;
                    if (email) infos.hasEmail = email.textContent;
                    if (phone) infos.hasTelephone = phone.textContent;
                    if (url) infos.hasURL = url;

                    others.push(infos);
                }
            }
        }

        contactPoint = others.length === 0 ? undefined : others[0];
        this.fetched.contactPoint = contactPoint;
        return contactPoint; // TODO index all contacts
    }

    getUrlCheckRequestConfig(uri: string): OptionsWithUri {
        let config: OptionsWithUri = {
            method: 'GET',
            json: false,
            headers: RequestDelegate.defaultRequestHeaders(),
            qs: {},
            uri: uri
        };

        if (this.settings.proxy) {
            config.proxy = this.settings.proxy;
        }

        return config;
    }

    protected getUuid(): string {
        return this.uuid;
    }

    executeCustomCode(doc: any) {
        try {
            if (this.settings.customCode) {
                eval(this.settings.customCode);
            }
        } catch (error) {
            throwError('An error occurred in custom code: ' + error.message);
        }
    }
}

// Private interface. Do not export
interface creatorType {
    name?: string;
    mbox?: string;
}
