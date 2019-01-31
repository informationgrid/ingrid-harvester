/**
 * A mapper for ISO-XML documents harvested over CSW.
 */
import {GenericMapper} from "../model/generic-mapper";
import {SelectedValue} from "xpath";
import {getLogger} from "log4js";
import {UrlUtils} from "../utils/url-utils";
import {Summary} from "../model/summary";

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
    private readonly issued: string;

    private readonly idInfo: SelectedValue;
    private settings: any;
    private readonly uuid: string;
    private summary: Summary;

    private keywordsAlreadyFetched = false;
    private fetched: any = {
        contactPoint: null,
        license: null,
        keywords: {}
    };


    constructor(settings, record, harvestTime, issued, summary) {
        super();
        this.settings = settings;
        this.record = record;
        this.harvestTime = harvestTime;
        this.issued = issued;
        this.summary = summary;

        this.uuid = CswMapper.getCharacterStringContent(record, 'fileIdentifier');

        this.idInfo = CswMapper.select('./gmd:identificationInfo', record, true);

    }

    getDescription() {
        let abstract = CswMapper.getCharacterStringContent(this.idInfo, 'abstract');
        if (!abstract) {
            let msg = 'Dataset doesn\'t have an abstract.';
            this.log.warn(`${msg} It will not be displayed in the portal. Id: '${this.uuid}', title: '${this.getTitle()}', source: '${this.settings.getRecordsUrl}'`);
            this.errors.push(msg);
            this.valid = false;
            this.summary.numErrors++;
        }

        return abstract;
    }


    async getDistributions(): Promise<any[]> {
        let dists = [];
        let urlsFound = [];
        let srvIdent = CswMapper.select('./srv:SV_ServiceIdentification', this.idInfo, true);
        if (srvIdent) {
            let getCapabilitiesElement = CswMapper.select(
                './srv:containsOperations/srv:SV_OperationMetadata[./srv:operationName/gco:CharacterString[contains(./text(), "GetCapabilities")]]/srv:connectPoint/*/gmd:linkage/gmd:URL',
                srvIdent,
                true);
            let getCapablitiesUrl = getCapabilitiesElement ? getCapabilitiesElement.textContent : null;
            let format = CswMapper.select('.//srv:serviceType/gco:LocalName', srvIdent, true).textContent;
            let serviceLinks = [];
            if (getCapablitiesUrl) {
                let lowercase = getCapablitiesUrl.toLowerCase();
                if (lowercase.match(/\bwms\b/)) format = 'WMS';
                if (lowercase.match(/\bwfs\b/)) format = 'WFS';
                if (lowercase.match(/\bwcs\b/)) format = 'WCS';
                if (lowercase.match(/\bwmts\b/)) format = 'WMTS';
            }
            let urls = CswMapper.select('./srv:containsOperations/*/srv:connectPoint/*/gmd:linkage/gmd:URL', srvIdent);
            for (let i=0; i<urls.length; i++) {
                let node = urls[i];
                let url = await UrlUtils.urlWithProtocolFor(node.textContent);
                if (url && !serviceLinks.includes(url)) {
                    serviceLinks.push(url);
                    urlsFound.push(url);
                }
            }

            serviceLinks.forEach(url => {
                dists.push({
                    format: format,
                    accessURL: url
                });
            });
        }

        let distNodes = CswMapper.select('./gmd:distributionInfo/gmd:MD_Distribution', this.record);
        for (let i=0; i<distNodes.length; i++) {
            let node = distNodes[i];
            let id = node.getAttribute('id');
            if (!id) id = node.getAttribute('uuid');

            let formats = [];
            let urls = [];

            CswMapper.select('.//gmd:MD_Format/gmd:name/gco:CharacterString', node).forEach(fmt => {
                if (!formats.includes(fmt.textContent)) formats.push(fmt.textContent);
            });
            let nodes = CswMapper.select('.//gmd:MD_DigitalTransferOptions/gmd:onLine/*/gmd:linkage/gmd:URL', node);
            for(let j=0; j<nodes.length; j++) {
                let node = nodes[j];
                let url = node ? await UrlUtils.urlWithProtocolFor(node.textContent) : null;
                if (url && !urls.includes(url)) urls.push(url);
            }

            // Combine formats in a single slash-separated string
            let format = formats.join(',');
            if (!format) format = 'Unbekannt';
            // Filter out URLs that have already been found
            urls = urls.filter(item => !urlsFound.includes(item));

            urls.forEach(url => {
                let dist: any = {};

                // Set id only if there is a single resource
                if (urls.length === 1) dist.id = id;

                dist.format = format;
                dist.accessURL = url;

                dists.push(dist);
            });
        }

        if (dists.length === 0) {
            let msg = 'Dataset has no links for download/access.';
            this.summary.missingLinks++;
            this.log.warn(`${msg} It will not be displayed in the portal. Id: '${this.uuid}', source: '${this.settings.getRecordsUrl}'`);

            this.valid = false;
            this.errors.push(msg);
            this.summary.numErrors++;
        }

        return dists;
    }

    async getPublisher(): Promise<any[]> {
        let publishers = [];
        // Look up contacts for the dataset first and then the metadata contact
        let queries = [
            './gmd:identificationInfo/*/gmd:pointOfContact/gmd:CI_ResponsibleParty',
            './gmd:contact/gmd:CI_ResponsibleParty'
        ];
        for (let i = 0; i < queries.length; i++) {
            let contacts = CswMapper.select('./gmd:identificationInfo/*/gmd:pointOfContact/gmd:CI_ResponsibleParty', this.record);
            for (let j = 0; j < contacts.length; j++) {
                let contact = contacts[j];
                let role = CswMapper.select('./gmd:role/gmd:CI_RoleCode/@codeListValue', contact, true).textContent;

                let name = CswMapper.select('./gmd:individualName/gco:CharacterString', contact, true);
                let org = CswMapper.select('./gmd:organisationName/gco:CharacterString', contact, true);
                let urlNode = CswMapper.select('./gmd:contactInfo/*/gmd:onlineResource/*/gmd:linkage/gmd:URL', contact, true);
                let url = urlNode ? await UrlUtils.urlWithProtocolFor(urlNode.textContent) : null;

                if (role === 'publisher') {
                    let infos: any = {};

                    if (name) infos.name = name.textContent;
                    if (url) infos.homepage = url;
                    if (org) infos.organization = org.textContent;

                    publishers.push(infos);
                }
            }
        }
        return publishers.length > 0 ? publishers : undefined;
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
                if (k === 'mcloud_category_roads') subgroups.push('roads');
                if (k === 'mcloud_category_climate') subgroups.push('climate');
                if (k === 'mcloud_category_waters') subgroups.push('waters');
                if (k === 'mcloud_category_railway') subgroups.push('railway');
                if (k === 'mcloud_category_infrastructure') subgroups.push('infrastructure');
                if (k === 'mcloud_category_aviation') subgroups.push('aviation');
            });
        }
        if (subgroups.length === 0) subgroups.push(this.settings.defaultMcloudSubgroup);
        return subgroups;
    }

    getCitation(): string {
        return undefined;
    }

    async getDisplayContacts() {

        let contactPoint = await this.getContactPoint();

        if (contactPoint) {
            let displayName;

            if (contactPoint['organization-name']) {
                displayName = contactPoint['organization-name'];
            } else if (contactPoint.fn) {
                displayName = contactPoint.fn;
            }

            return CswMapper.createDisplayContact(displayName, contactPoint.hasURL);
        } else {
            let publisher = await this.getPublisher();

            if (publisher) {
                let displayName;

                if (publisher[0].organization) {
                    displayName = publisher[0].organization;
                } else if (publisher[0].name) {
                    displayName = publisher[0].name;
                }

                return CswMapper.createDisplayContact(displayName, publisher[0].homepage);
            } else {
                let displayName;
                let creator = this.getCreatorWithOrganisation();

                if (creator[0].organisationName) {
                    displayName = creator[0].organisationName;
                } else if (creator[0].name) {
                    displayName = creator[0].name;
                }

                return CswMapper.createDisplayContact(displayName, creator[0].homepage);
            }
        }

        return undefined;
    }

    getGeneratedId(): string {
        return undefined;
    }

    /**
     * Extracts and returns an array of keywords defined in the ISO-XML document.
     * This method also checks if these keywords contain at least one of the
     * given mandatory keywords. If this is not the case, then the mapped
     * document is flagged to be skipped from the index. By default this array
     * contains just one entry 'opendata' i.e. if the ISO-XML document doesn't
     * have this keyword defined, then it will be skipped from the index.
     *
     * @param mandatoryKws array of mandatory keywords, at least one of which
     * must be found in the ISO-XML document for it to be indexed
     */
    getKeywords(mandatoryKws : string[] = ['opendata']): string[] {

        let keywords = this.fetched.keywords[mandatoryKws.join()];
        if (keywords) {
            return keywords;
        }

        keywords = [];
        CswMapper.select('.//gmd:descriptiveKeywords/*/gmd:keyword/gco:CharacterString', this.record).forEach(node => {
            keywords.push(node.textContent);
        });

        // Update the statistics
        if (!this.keywordsAlreadyFetched && keywords.includes('opendata')) {
            this.summary.opendata++;
        }

        this.keywordsAlreadyFetched = true;

        // Check if at least one mandatory keyword is present
        let valid = keywords.reduce((accumulator, currentValue) => {
            return accumulator || mandatoryKws.includes(currentValue);
        }, false);
        if (!valid) {
            // Don't index metadata-sets without any of the mandatory keywords
            this.log.info(`None of the mandatory keywords ${JSON.stringify(mandatoryKws)} found. Item will be ignored. ID: '${this.uuid}', Title: '${this.getTitle()}', Source: '${this.settings.getRecordsUrl}'.`);
            this.skipped = true;
        }

        this.fetched.keywords[mandatoryKws.join()] = keywords;
        return keywords;
    }

    async getLicenseId(): Promise<string> {
        let license = await this.getLicense(this.idInfo);
        if (license) {
            if (license.id) return license.id;
        }
        if (!license || !license.id) {
            let msg = 'No license detected for dataset.';
            this.summary.missingLicense++;
            this.log.warn(`${msg} ${this.getErrorSuffix(this.uuid, this.getTitle())}`);

            this.errors.push(msg);
            this.summary.numErrors++;
            return 'Unbekannt';
        }
        return undefined;
    }

    async getLicenseURL(): Promise<string> {
        let license = await this.getLicense(this.idInfo);
        if (license) {
            if (license.url) return license.url;
        }
        return undefined;
    }

    getMFundFKZ(): string {
        // Detect mFund properties
        let keywords = this.getKeywords();
        if (keywords) {
            keywords.forEach(kw => {
                let kwLower = kw.toLowerCase();
                if (kwLower.startsWith('mfund-fkz:')) {
                    let idx = kw.indexOf(':');
                    let fkz = kw.substr(idx + 1);

                    if (fkz) return fkz.trim();
                }
            });
        }
        return undefined;
    }

    getMFundProjectTitle(): string {
        // Detect mFund properties
        let keywords = this.getKeywords();
        if (keywords) {
            keywords.forEach(kw => {
                let kwLower = kw.toLowerCase();
                if (kwLower.startsWith('mfund-projekt:')) {
                    let idx = kw.indexOf(':');
                    let mfName = kw.substr(idx + 1);

                    if (mfName) return mfName.trim();
                }
            });
        }
        return undefined;
    }

    getMetadataIssued(): Date {
        return this.issued ? new Date(this.issued) : new Date(Date.now());
    }

    getMetadataSource(): any {
        let cswLink = this.settings.getRecordsUrlFor(this.uuid);
        return {
            raw_data_source: cswLink,
            portal_link: this.settings.defaultAttributionLink,
            attribution: this.settings.defaultAttribution
        };
    }

    getModifiedDate() {
        return new Date(CswMapper.select('./gmd:dateStamp/gco:Date|./gmd:dateStamp/gco:DateTime', this.record, true).textContent);
    }

    getTemporal() {
        let suffix = this.getErrorSuffix(this.uuid, this.getTitle());
        let nodes = CswMapper.select('./*/gmd:extent/*/gmd:temporalElement/*/gmd:extent//gml:TimeInstant/gml:timePosition', this.idInfo);
        let times = nodes.map(node => node.textContent);
        if (times.length === 1) {
            return times[0];
        } else if (times.length > 1) {
            this.log.warn(`Multiple time instants defined: [${times.join(', ')}]. ${suffix}`);
            return times;
        }
        return undefined;
    }

    getTemporalStart(): Date {
        let suffix = this.getErrorSuffix(this.uuid, this.getTitle());

        let nodes = CswMapper.select('./*/gmd:extent/*/gmd:temporalElement/*/gmd:extent//gml:TimePeriod', this.idInfo);
        if (nodes.length > 1) {
            this.log.warn(`Multiple time extents defined. Using only the first one. ${suffix}`);
        }
        if (nodes.length > 0) {
            let begin = CswMapper.select('./gml:beginPosition', nodes[0], true);
            if (!begin) {
                begin = CswMapper.select('./gml:begin/*/gml:timePosition', nodes[0], true);
            }
            try {
                if (!begin.hasAttribute('indeterminatePosition')) {
                    return begin.textContent;
                }
            } catch (e) {
                this.log.error(`Cannot extract time range. ${suffix}`, e);
            }
        }
        return undefined;
    }

    getTemporalEnd(): Date {
        let suffix = this.getErrorSuffix(this.uuid, this.getTitle());

        let nodes = CswMapper.select('./*/gmd:extent/*/gmd:temporalElement/*/gmd:extent//gml:TimePeriod', this.idInfo);
        if (nodes.length > 1) {
            this.log.warn(`Multiple time extents defined. Using only the first one. ${suffix}`);
        }
        if (nodes.length > 0) {
            let end = CswMapper.select('./gml:endPosition', nodes[0], true);
            if (!end) {
                end = CswMapper.select('./gml:end/*/gml:timePosition', nodes[0], true);
            }
            try {
                if (!end.hasAttribute('indeterminatePosition')) {
                    return end.textContent;
                }
            } catch (e) {
                this.log.error(`Cannot extract time range. ${suffix}`, e);
            }
        }
        return undefined;
    }

    getThemes() {
        return ['http://publications.europa.eu/resource/authority/data-theme/TRAN']; // see https://joinup.ec.europa.eu/release/dcat-ap-how-use-mdr-data-themes-vocabulary;
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
            return node.textContent;
        }
    }

    getAccrualPeriodicity(): string {
        // Multiple resourceMaintenance elements are allowed. If present, use the first one
        let freq = CswMapper.select('./*/gmd:resourceMaintenance/*/gmd:maintenanceAndUpdateFrequency/gmd:MD_MaintenanceFrequencyCode', this.idInfo);
        if (freq.length > 0) {
            return freq[0].getAttribute('codeListValue');
        }
        return undefined;
    }

    async getLicense(idInfo) {
        let license = this.fetched.license;
        if (license) {
            return license;
        }

        let constraints = CswMapper.select('./*/gmd:resourceConstraints/*[./gmd:useConstraints/gmd:MD_RestrictionCode/@codeListValue="license"]', idInfo);
        if (constraints && constraints.length > 0) {
            let license: any = {};
            for(let j=0; j<constraints.length; j++) {
                let c = constraints[j];
                let nodes = CswMapper.select('./gmd:otherConstraints', c);
                for (let i = 0; i < nodes.length; i++) {
                    let text = CswMapper.getCharacterStringContent(nodes[i]);
                    try {
                        let json = JSON.parse(text);

                        if (!json.id || !json.url) continue;

                        license.id = json.id;
                        license.text = json.name;
                        license.url = json.url;
                    } catch(ignored) {}
                }
            }

            this.fetched.license = license;
            return license;
        }
    }

    getErrorSuffix(uuid, title) {
        return `Id: '${uuid}', title: '${title}', source: '${this.settings.getRecordsUrl}'.`;
    }

    getHarvestedData(): string {
        return this.record.toString();
    }

    getLicenseTitle(): string {
        return undefined;
    }

    getCreator(): any[] {
        let creators = this.getCreatorWithOrganisation();

        if (creators) {
            // we don't need the organisation here
            creators.forEach( c => delete c.organisationName);
        }
        return creators;
    }

    private getCreatorWithOrganisation(): any[] {
        let creators = [];
        // Look up contacts for the dataset first and then the metadata contact
        let queries = [
            './gmd:identificationInfo/*/gmd:pointOfContact/gmd:CI_ResponsibleParty',
            './gmd:contact/gmd:CI_ResponsibleParty'
        ];
        for (let i=0; i<queries.length; i++) {
            let contacts = CswMapper.select('./gmd:identificationInfo/*/gmd:pointOfContact/gmd:CI_ResponsibleParty', this.record);
            for (let j = 0; j < contacts.length; j++) {
                let contact = contacts[j];
                let role = CswMapper.select('./gmd:role/gmd:CI_RoleCode/@codeListValue', contact, true).textContent;

                let name = CswMapper.select('./gmd:individualName/gco:CharacterString', contact, true);
                let organisation = CswMapper.select('./gmd:organisationName/gco:CharacterString', contact, true);
                let email = CswMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:electronicMailAddress/gco:CharacterString', contact, true);

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
            let contacts = CswMapper.select('./gmd:identificationInfo/*/gmd:pointOfContact/gmd:CI_ResponsibleParty', this.record);
            for (let j = 0; j < contacts.length; j++) {
                let contact = contacts[j];
                let role = CswMapper.select('./gmd:role/gmd:CI_RoleCode/@codeListValue', contact, true).textContent;

                let name = CswMapper.select('./gmd:individualName/gco:CharacterString', contact, true);
                let org = CswMapper.select('./gmd:organisationName/gco:CharacterString', contact, true);
                let delPt = CswMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:deliveryPoint', contact);
                let region = CswMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:administrativeArea/gco:CharacterString', contact, true);
                let country = CswMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:country/gco:CharacterString', contact, true);
                let postCode = CswMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:postalCode/gco:CharacterString', contact, true);
                let email = CswMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:electronicMailAddress/gco:CharacterString', contact, true);
                let phone = CswMapper.select('./gmd:contactInfo/*/gmd:phone/*/gmd:voice/gco:CharacterString', contact, true);
                let urlNode = CswMapper.select('./gmd:contactInfo/*/gmd:onlineResource/*/gmd:linkage/gmd:URL', contact, true);
                let url = urlNode ? await UrlUtils.urlWithProtocolFor(urlNode.textContent) : null;


                if (role !== 'originator' && role !== 'author' && role !== 'publisher') {
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
}

// Private interface. Do not export
interface creatorType {
    name? : string;
    mbox? : string;
}
