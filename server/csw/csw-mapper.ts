/**
 * A mapper for CKAN documents.
 */
import {GenericMapper} from "../model/generic-mapper";
import {SelectedValue} from "xpath";
import {getLogger} from "log4js";
import {UrlUtils} from "../utils/url-utils";

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

    private record: any;
    private harvestTime: any;
    private issued: string;

    private idInfo: SelectedValue;
    private settings: any;
    private uuid: string;
    private summary = {
        numMatched: 0,
        opendata: 0,
        missingLinks: 0,
        missingLicense: 0,
        ok: 0
    };


    constructor(settings, record, harvestTime, issued) {
        super();
        this.settings = settings;
        this.record = record;
        this.harvestTime = harvestTime;
        this.issued = issued;

        this.uuid = CswMapper.getCharacterStringContent(record, 'fileIdentifier');

        this.idInfo = CswMapper.select('./gmd:identificationInfo', record, true);

    }

    getDescription() {
        return CswMapper.getCharacterStringContent(this.idInfo, 'abstract');
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
        return dists;
    }

    async getPublisher() {
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
                let delPt = CswMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:deliveryPoint', contact);
                let region = CswMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:administrativeArea/gco:CharacterString', contact, true);
                let country = CswMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:country/gco:CharacterString', contact, true);
                let postCode = CswMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:postalCode/gco:CharacterString', contact, true);
                let email = CswMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:electronicMailAddress/gco:CharacterString', contact, true);
                let phone = CswMapper.select('./gmd:contactInfo/*/gmd:phone/*/gmd:voice/gco:CharacterString', contact, true);
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
        return publishers.length > 0 ? publishers : null;
    }

    getTitle() {
        return CswMapper.getCharacterStringContent(this.idInfo, 'title')
    }

    getAccessRights(): string[] {
        /*
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
        return null;
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
        return "";
    }

    async getDisplayContacts() {
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
                let urlNode = CswMapper.select('./gmd:contactInfo/*/gmd:onlineResource/*/gmd:linkage/gmd:URL', contact, true);
                let url = urlNode ? await UrlUtils.urlWithProtocolFor(urlNode.textContent) : null;

                if (role === 'originator' || role === 'author') {
                    let displayName = org.textContent ? org.textContent : name.textContent;
                    let displayUrl = url;
                    return CswMapper.createDisplayContact(displayName, displayUrl);
                }
            }
        }
        return null;
    }

    async extractContacts(target, record) {
    }

    getGeneratedId(): string {
        return "";
    }

    getKeywords(): string[] {
        let keywords = [];
        CswMapper.select('.//gmd:descriptiveKeywords/*/gmd:keyword/gco:CharacterString', this.record).forEach(node => {
            keywords.push(node.textContent);
        });
        if (keywords.includes('opendata')) {
            this.summary.opendata++;
        } else {
            // Don't index metadata-sets without the `opendata' keyword
            this.log.info(`Keyword 'opendata' not found. Item will be ignored. ID: '${this.uuid}', Title: '${this.getTitle()}', Source: '${this.settings.getRecordsUrl}'.`);
            return null;
        }

        return keywords;
    }

    async getLicenseId(): Promise<string> {
        let license = await CswMapper.getLicense(this.idInfo);
        if (license) {
            if (license.id) return license.id;
        }
        if (!license || !license.id) {
            let msg = 'No license detected for dataset.';
            if (this.settings.printSummary) this.summary.missingLicense++;
            this.log.warn(`${msg} ${this.getErrorSuffix(this.uuid, this.getTitle())}`);

            if (!this.errors) {
                this.errors = [];
            }
            this.errors.push(msg);
            return 'Unbekannt';
        }
        return null;
    }

    async getLicenseURL(): Promise<string> {
        let license = await CswMapper.getLicense(this.idInfo);
        if (license) {
            if (license.url) return license.url;
        }
        return null;
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
        return null;
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
        return null;
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
        return CswMapper.select('./gmd:dateStamp/gco:Date|./gmd:dateStamp/gco:DateTime', this.record, true).textContent;
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
        return null;
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
        return null;
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
        return null;
    }

    getThemes() {
        return ['http://publications.europa.eu/resource/authority/data-theme/TRAN']; // see https://joinup.ec.europa.eu/release/dcat-ap-how-use-mdr-data-themes-vocabulary;
    }

    isRealtime(): boolean {
        return false;
    }

    static getCharacterStringContent(element, cname?) {
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
        return null;
    }

    static async getLicense(idInfo) {
        let constraints = CswMapper.select('./*/gmd:resourceConstraints/*[./gmd:useConstraints/gmd:MD_RestrictionCode/@codeListValue="license"]', idInfo);
        if (constraints && constraints.length > 0) {
            let license: any = {};
            for(let j=0; j<constraints.length; j++) {
                let c = constraints[j];
                // Search until id and url are not defined
                let nodes = CswMapper.select('./gmd:otherConstraints', c);
                for (let i = 0; i < nodes.length && (!license.id || !license.url); i++) {
                    let text = CswMapper.getCharacterStringContent(nodes[i]);
                    license.text = text;
                    let match = text.match(/"name"\s*:\s*"([^"]+)"/);
                    if (match) {
                        license.id = match[1];
                    } else {
                        delete license.id;
                    }
                    match = text.match(/"url"\s*:\s*"([^"]+)"/);
                    if (match) {
                        license.url = await UrlUtils.urlWithProtocolFor(match[1]);
                    } else {
                        delete license.url;
                    }
                }
            }
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
        return "";
    }

    getCreator() {
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
                if (!name) name = CswMapper.select('./gmd:organisationName/gco:CharacterString', contact, true);
                let email = CswMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:electronicMailAddress/gco:CharacterString', contact, true);


                if (role === 'originator' || role === 'author') {
                    let creator = CswMapper.createCreator(name.textContent, email.textContent);

                    let alreadyPresent = creators.filter(c => c.name === creator.name && c.mbox === creator.mbox).length > 0;
                    if (!alreadyPresent) {
                        creators.push(creator);
                    }
                }
            }
        }
        return creators;
    }

    getGroups(): string[] {
        return null;
    }

    getIssued(): Date {
        return null;
    }

    getMetadataHarvested(): Date {
        return null;
    }

    getSubSections(): any[] {
        return null;
    }

}
