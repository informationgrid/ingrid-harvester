/**
 * A mapper for ISO-XML documents harvested over CSW.
 */
import {Agent, DateRange, Distribution, GenericMapper, Organization, Person} from "../../model/generic.mapper";
import {License} from '@shared/license.model';
import {getLogger} from "log4js";
import {UrlUtils} from "../../utils/url.utils";
import {RequestDelegate} from "../../utils/http-request.utils";
import {OaiSummary} from "./oai.importer";
import {OptionsWithUri} from "request-promise";
import {OaiSettings} from './oai.settings';
import {throwError} from "rxjs";
import doc = Mocha.reporters.doc;

let xpath = require('xpath');

export class OaiMapper extends GenericMapper {

    static GMD = 'http://www.isotc211.org/2005/gmd';
    static GCO = 'http://www.isotc211.org/2005/gco';
    static GML = 'http://www.opengis.net/gml';
    static CSW = 'http://www.opengis.net/cat/csw/2.0.2';
    static SRV = 'http://www.isotc211.org/2005/srv';

    static select = xpath.useNamespaces({
        'gmd': OaiMapper.GMD,
        'gco': OaiMapper.GCO,
        'gml': OaiMapper.GML,
        'srv': OaiMapper.SRV
    });

    private log = getLogger();

    private readonly record: any;
    private harvestTime: any;
    private readonly issued: string;

    protected readonly idInfo; // : SelectedValue;
    private settings: OaiSettings;
    private readonly uuid: string;
    private summary: OaiSummary;

    private keywordsAlreadyFetched = false;
    private fetched: any = {
        contactPoint: null,
        keywords: {},
        themes: null
    };


    constructor(settings, record, harvestTime, issued, summary) {
        super();
        this.settings = settings;
        this.record = record;
        this.harvestTime = harvestTime;
        this.issued = issued;
        this.summary = summary;

        this.uuid = OaiMapper.getCharacterStringContent(record, 'fileIdentifier');

        this.idInfo = OaiMapper.select('./gmd:identificationInfo', record, true);

    }

    getDescription() {
        let abstract = OaiMapper.getCharacterStringContent(this.idInfo, 'abstract');
        if (!abstract) {
            let msg = `Dataset doesn't have an abstract. It will not be displayed in the portal. Id: \'${this.uuid}\', title: \'${this.getTitle()}\', source: \'${this.settings.providerUrl}\'`;
            this.log.warn(msg);
            this.summary.warnings.push(['No description', msg]);
            this.valid = false;
        }

        return abstract;
    }


    async getDistributions(): Promise<Distribution[]> {
        let dists = [];
        let urlsFound = [];

        let srvIdent = OaiMapper.select('./srv:SV_ServiceIdentification', this.idInfo, true);
        if (srvIdent) {
            dists = await this.handleDistributionforService(srvIdent, urlsFound);
        }

        let distNodes = OaiMapper.select('./gmd:distributionInfo/gmd:MD_Distribution', this.record);
        for (let i=0; i<distNodes.length; i++) {
            let distNode = distNodes[i];
            let id = distNode.getAttribute('id');
            if (!id) id = distNode.getAttribute('uuid');

            let formats = [];
            let urls: Distribution[] = [];

            OaiMapper.select('.//gmd:MD_Format/gmd:name/gco:CharacterString', distNode).forEach(format => {
                format.textContent.split(',').forEach(formatItem => {
                    if (!formats.includes(formatItem)) {
                        formats.push(formatItem.trim());
                    }
                });
            });

            // Combine formats in a single slash-separated string
            if (formats.length === 0) formats.push('Unbekannt');

            let onlineResources = OaiMapper.select('.//gmd:MD_DigitalTransferOptions/gmd:onLine/gmd:CI_OnlineResource', distNode);
            for(let j=0; j<onlineResources.length; j++) {
                let onlineResource = onlineResources[j];

                let urlNode = OaiMapper.select('gmd:linkage/gmd:URL', onlineResource);
                let title = OaiMapper.select('gmd:name/gco:CharacterString', onlineResource);
                let protocolNode = OaiMapper.select('gmd:protocol/gco:CharacterString', onlineResource);

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
                        format: UrlUtils.mapFormat(formats, this.summary.warnings)
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
            let msg = `Dataset has no links for download/access. It will not be displayed in the portal. Id: \'${this.uuid}\', source: \'${this.settings.providerUrl}\'`;
            this.summary.missingLinks++;
            this.log.warn(msg);

            this.valid = false;
            this.summary.warnings.push(['No links', msg]);
        }

        return dists;
    }

    async handleDistributionforService(srvIdent, urlsFound): Promise<Distribution[]> {

        let getCapabilitiesElement = OaiMapper.select(
            // convert containing text to lower case
            './srv:containsOperations/srv:SV_OperationMetadata[./srv:operationName/gco:CharacterString/text()[contains(translate(\'GetCapabilities\', \'ABCEGILPST\', \'abcegilpst\'), "getcapabilities")]]/srv:connectPoint/*/gmd:linkage/gmd:URL',
            srvIdent,
            true);
        let getCapablitiesUrl = getCapabilitiesElement ? getCapabilitiesElement.textContent : null;
        let serviceFormat = OaiMapper.select('.//srv:serviceType/gco:LocalName', srvIdent, true).textContent;
        let serviceLinks: Distribution[] = [];

        if (getCapablitiesUrl) {
            let lowercase = getCapablitiesUrl.toLowerCase();
            if (lowercase.match(/\bwms\b/)) serviceFormat = 'WMS';
            if (lowercase.match(/\bwfs\b/)) serviceFormat = 'WFS';
            if (lowercase.match(/\bwcs\b/)) serviceFormat = 'WCS';
            if (lowercase.match(/\bwmts\b/)) serviceFormat = 'WMTS';
        }

        let onlineResources = OaiMapper
            .select('./srv:containsOperations/*/srv:connectPoint/*/gmd:CI_OnlineResource', srvIdent);

        for (let i=0; i<onlineResources.length; i++) {
            let onlineResource = onlineResources[i];

            let urlNode = OaiMapper.select('gmd:linkage/gmd:URL', onlineResource);
            let protocolNode = OaiMapper.select('gmd:protocol/gco:CharacterString', onlineResource);

            let requestConfig = this.getUrlCheckRequestConfig(urlNode.textContent);
            let url = await UrlUtils.urlWithProtocolFor(requestConfig);
            if (url && !urlsFound.includes(url)) {
                serviceLinks.push({
                    accessURL: url,
                    format: protocolNode.textContent ? protocolNode.textContent : serviceFormat
                });
                urlsFound.push(url);
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
            let contacts = OaiMapper.select(queries[i], this.record);
            for (let j = 0; j < contacts.length; j++) {
                let contact = contacts[j];
                let role = OaiMapper.select('./gmd:role/gmd:CI_RoleCode/@codeListValue', contact, true).textContent;

                let name = OaiMapper.select('./gmd:individualName/gco:CharacterString', contact, true);
                let org = OaiMapper.select('./gmd:organisationName/gco:CharacterString', contact, true);
                let urlNode = OaiMapper.select('./gmd:contactInfo/*/gmd:onlineResource/*/gmd:linkage/gmd:URL', contact, true);

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
        let title = OaiMapper.getCharacterStringContent(this.idInfo, 'title');
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
        let limitations = OaiMapper.select('./*/gmd:resourceConstraints/*/gmd:useLimitation', this.idInfo)
            .map(node => OaiMapper.getCharacterStringContent(node)) // Extract the text
            .filter(text => text) // Filter out falsy items
            .map(text => text.trim());

        // Select 'otherConstraints' elements that have a 'useConstraints' sibling
        let constraints = OaiMapper.select('./*/gmd:resourceConstraints/*[./gmd:useConstraints and ./gmd:otherConstraints]/gmd:otherConstraints', this.idInfo)
            .map(node => OaiMapper.getCharacterStringContent(node)) // Extract the text
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
                    name: displayName,
                    homepage: publisher[0].homepage
                };
            } else {
                let creator = this.getCreator();

                displayContact = {
                    name: creator[0].name,
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
        OaiMapper.select('.//gmd:descriptiveKeywords/*/gmd:keyword/gco:CharacterString', this.record).forEach(node => {
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
            this.log.info(`None of the mandatory keywords ${JSON.stringify(mandatoryKws)} found. Item will be ignored. ID: '${this.uuid}', Title: '${this.getTitle()}', Source: '${this.settings.providerUrl}'.`);
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
        return this.issued ? new Date(this.issued) : new Date(Date.now());
    }

    getMetadataSource(): any {
        let oaiLink = `${this.settings.providerUrl}?verb=GetRecord&metadataPrefix=iso19139&identifier=${this.uuid}`;
        return {
            raw_data_source: oaiLink,
            portal_link: this.settings.defaultAttributionLink,
            attribution: this.settings.defaultAttribution
        };
    }

    getModifiedDate() {
        return new Date(OaiMapper.select('./gmd:dateStamp/gco:Date|./gmd:dateStamp/gco:DateTime', this.record, true).textContent);
    }

    getSpatial(): any {
        let geographicBoundingBoxes = OaiMapper.select('(./srv:SV_ServiceIdentification/srv:extent|./gmd:MD_DataIdentification/gmd:extent)/gmd:EX_Extent/gmd:geographicElement/gmd:EX_GeographicBoundingBox', this.idInfo);
        let geometries = [];
        for(let i=0; i < geographicBoundingBoxes.length; i++){
            let geographicBoundingBox = geographicBoundingBoxes[i];
            let west = parseFloat(OaiMapper.select('./gmd:westBoundLongitude', geographicBoundingBox, true).textContent.trimLeft().trim());
            let east = parseFloat(OaiMapper.select('./gmd:eastBoundLongitude', geographicBoundingBox, true).textContent.trimLeft().trim());
            let south = parseFloat(OaiMapper.select('./gmd:southBoundLatitude', geographicBoundingBox, true).textContent.trimLeft().trim());
            let north = parseFloat(OaiMapper.select('./gmd:northBoundLatitude', geographicBoundingBox, true).textContent.trimLeft().trim());

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
        let geoGraphicDescriptions = OaiMapper.select('(./srv:SV_ServiceIdentification/srv:extent|./gmd:MD_DataIdentification/gmd:extent)/gmd:EX_Extent/gmd:geographicElement/gmd:EX_GeographicDescription', this.idInfo);
        let result = [];
        for(let i=0; i < geoGraphicDescriptions.length; i++)
        {
            let geoGraphicDescription = geoGraphicDescriptions[i];
            let geoGraphicCode = OaiMapper.select('./gmd:geographicIdentifier/gmd:MD_Identifier/gmd:code/gco:CharacterString', geoGraphicDescription, true);
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

        let nodes = OaiMapper.select('./*/gmd:extent/*/gmd:temporalElement/*/gmd:extent//gml:TimePeriod', this.idInfo);

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
        nodes = OaiMapper.select('./*/gmd:extent/*/gmd:temporalElement/*/gmd:extent//gml:TimeInstant/gml:timePosition', this.idInfo);

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

    getTimeValue(nodes, beginOrEnd: 'begin' | 'end'): Date {
        let dateNode = OaiMapper.select('./gml:' + beginOrEnd + 'Position', nodes[0], true);
        if (!dateNode) {
            dateNode = OaiMapper.select('./gml:' + beginOrEnd + '/*/gml:timePosition', nodes[0], true);
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
        let themes = OaiMapper.select(xpath, this.record)
            .map(node => OaiMapper.dcatThemeUriFromKeyword(node.textContent))
            .filter(theme => theme); // Filter out falsy values

        if (!themes || themes.length === 0) {
            // Fall back to default value
            themes = this.settings.defaultDCATCategory
                .map( category => GenericMapper.DCAT_CATEGORY_URL + category);
        }

        this.fetched.themes = themes;
        return themes;
    }

    isRealtime(): boolean {
        return undefined;
    }

    static getCharacterStringContent(element, cname?): string {
        if (cname) {
            let node = OaiMapper.select(`.//gmd:${cname}/gco:CharacterString`, element, true);
            if (node) {
                return node.textContent;
            }
        } else {
            let node = OaiMapper.select('./gco:CharacterString', element, true);
            return node ? node.textContent : null;
        }
    }

    getAccrualPeriodicity(): string {
        // Multiple resourceMaintenance elements are allowed. If present, use the first one
        let freq = OaiMapper.select('./*/gmd:resourceMaintenance/*/gmd:maintenanceAndUpdateFrequency/gmd:MD_MaintenanceFrequencyCode', this.idInfo);
        if (freq.length > 0) {
            return freq[0].getAttribute('codeListValue');
        }
        return undefined;
    }

    async getLicense() {
        let license: License;
        let constraints = OaiMapper.select('./*/gmd:resourceConstraints/*[./gmd:useConstraints/gmd:MD_RestrictionCode/@codeListValue="license"]', this.idInfo);

        if (constraints && constraints.length > 0) {
            for(let j=0; j<constraints.length; j++) {
                let c = constraints[j];
                let nodes = OaiMapper.select('./gmd:otherConstraints', c);
                for (let i = 0; i < nodes.length; i++) {
                    let text = OaiMapper.getCharacterStringContent(nodes[i]);
                    try {
                        let json = JSON.parse(text);

                        if (!json.id || !json.url) continue;

                        let requestConfig = this.getUrlCheckRequestConfig(json.url);
                        license = {
                            id: json.id,
                            title: json.name,
                            url: await UrlUtils.urlWithProtocolFor(requestConfig)
                        };

                    } catch(ignored) {}
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
        return `Id: '${uuid}', title: '${title}', source: '${this.settings.providerUrl}'.`;
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
        for (let i=0; i<queries.length; i++) {
            let contacts = OaiMapper.select(queries[i], this.record);
            for (let j = 0; j < contacts.length; j++) {
                let contact = contacts[j];
                let role = OaiMapper.select('./gmd:role/gmd:CI_RoleCode/@codeListValue', contact, true).textContent;

                let name = OaiMapper.select('./gmd:individualName/gco:CharacterString', contact, true);
                let organisation = OaiMapper.select('./gmd:organisationName/gco:CharacterString', contact, true);
                let email = OaiMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:electronicMailAddress/gco:CharacterString', contact, true);

                if (role === 'originator' || role === 'author') {
                    let creator : creatorType = {};
                    /*
                     * Creator has only one field for name. Use either the name
                     * of the organisation or the person for this field. The
                     * organisation name has a higher priority.
                     */
                    if (organisation) {
                        creator.name =  organisation.textContent;
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
        for (let i=0; i<queries.length; i++) {
            let contacts = OaiMapper.select(queries[i], this.record);
            for (let j = 0; j < contacts.length; j++) {
                let contact = contacts[j];
                let role = OaiMapper.select('./gmd:role/gmd:CI_RoleCode/@codeListValue', contact, true).textContent;

                if (role === 'originator') {
                    let name = OaiMapper.select('./gmd:individualName/gco:CharacterString', contact, true);
                    let org = OaiMapper.select('./gmd:organisationName/gco:CharacterString', contact, true);
                    let email = OaiMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:electronicMailAddress/gco:CharacterString', contact, true);
                    let url = OaiMapper.select('./gmd:contactInfo/*/gmd:onlineResource/*/gmd:linkage/gmd:URL', contact, true);

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
        for (let i=0; i<queries.length; i++) {
            let contacts = OaiMapper.select(queries[i], this.record);
            for (let j = 0; j < contacts.length; j++) {
                let contact = contacts[j];
                let role = OaiMapper.select('./gmd:role/gmd:CI_RoleCode/@codeListValue', contact, true).textContent;

                if (role !== 'originator' && role !== 'author' && role !== 'publisher') {
                    let name = OaiMapper.select('./gmd:individualName/gco:CharacterString', contact, true);
                    let org = OaiMapper.select('./gmd:organisationName/gco:CharacterString', contact, true);
                    let delPt = OaiMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:deliveryPoint', contact);
                    let region = OaiMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:administrativeArea/gco:CharacterString', contact, true);
                    let country = OaiMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:country/gco:CharacterString', contact, true);
                    let postCode = OaiMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:postalCode/gco:CharacterString', contact, true);
                    let email = OaiMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:electronicMailAddress/gco:CharacterString', contact, true);
                    let phone = OaiMapper.select('./gmd:contactInfo/*/gmd:phone/*/gmd:voice/gco:CharacterString', contact, true);
                    let urlNode = OaiMapper.select('./gmd:contactInfo/*/gmd:onlineResource/*/gmd:linkage/gmd:URL', contact, true);
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

                    let line1 = delPt.map(n => OaiMapper.getCharacterStringContent(n));
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
    name? : string;
    mbox? : string;
}
