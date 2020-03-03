/**
 * A mapper for ISO-XML documents harvested over CSW.
 */
import {Agent, DateRange, Distribution, GenericMapper, Organization, Person} from "../../model/generic.mapper";
import {License} from '@shared/license.model';
import {getLogger} from "log4js";
import {UrlUtils} from "../../utils/url.utils";
import {RequestDelegate} from "../../utils/http-request.utils";
import {DcatSummary} from "./dcat.importer";
import {OptionsWithUri} from "request-promise";
import {DcatSettings} from './dcat.settings';
import {DcatLicensesUtils} from "../../utils/dcat.licenses.utils";

let xpath = require('xpath');

export class DcatMapper extends GenericMapper {

    static FOAF = 'http://xmlns.com/foaf/0.1/';
    static LOCN = 'http://www.w3.org/ns/locn#';
    static HYDRA = 'http://www.w3.org/ns/hydra/core#';
    static RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
    static DCAT = 'http://www.w3.org/ns/dcat#';
    static DCT = 'http://purl.org/dc/terms/';
    static SKOS = 'ttp://www.w3.org/2004/02/skos/core#';
    static VCARD = 'http://www.w3.org/2006/vcard/ns#';
    static DCATDE = 'http://dcat-ap.de/def/dcatde/';

    static select = xpath.useNamespaces({
        'foaf': DcatMapper.FOAF,
        'locn': DcatMapper.LOCN,
        'hydra': DcatMapper.HYDRA,
        'rdf': DcatMapper.RDF,
        'dcat': DcatMapper.DCAT,
        'dct': DcatMapper.DCT,
        'skos': DcatMapper.SKOS,
        'vcard': DcatMapper.VCARD,
        'dcatde': DcatMapper.DCATDE
    });

    private log = getLogger();

    private readonly record: any;
    private readonly linkedDistributions: any;
    private harvestTime: any;
    private readonly issued: string;

//    protected readonly idInfo; // : SelectedValue;
    private settings: DcatSettings;
    private readonly uuid: string;
    private summary: DcatSummary;

    private keywordsAlreadyFetched = false;
    private fetched: any = {
        contactPoint: null,
        keywords: {},
        themes: null
    };


    constructor(settings, record, linkedDistributions, harvestTime, issued, summary) {
        super();
        this.settings = settings;
        this.record = record;
        this.harvestTime = harvestTime;
        this.issued = issued;
        this.summary = summary;
        this.linkedDistributions = linkedDistributions

        this.uuid = DcatMapper.select('.//dct:identifier', record, true).textContent;
    }

    getDescription() {
        let description = DcatMapper.select('.//dct:description', this.record, true);
        if (!description) {
            let msg = `Dataset doesn't have an description. It will not be displayed in the portal. Id: \'${this.uuid}\', title: \'${this.getTitle()}\', source: \'${this.settings.catalogUrl}\'`;
            this.log.warn(msg);
            this.summary.warnings.push(['No description', msg]);
            this.valid = false;
        } else {
            return description.textContent;
        }

        return undefined;
    }


    async getDistributions(): Promise<Distribution[]> {
        let dists = [];

        if (this.linkedDistributions) {
            for (let i = 0; i < this.linkedDistributions.length; i++) {
                this.linkedDistributions[i]

                let format: string = "Unbekannt";
                let formatNode = DcatMapper.select('./dct:format', this.linkedDistributions[i], true);
                if (formatNode) {
                    if (formatNode.textContent) {
                        format = formatNode.textContent;
                    } else {
                        format = formatNode.getAttribute('rdf:resource');
                    }
                }

                let url = DcatMapper.select('./dcat:accessURL', this.linkedDistributions[i], true);
                let title = DcatMapper.select('./dct:title', this.linkedDistributions[i], true);
                let issued = DcatMapper.select('./dct:issued', this.linkedDistributions[i], true);
                let modified = DcatMapper.select('./dct:modified', this.linkedDistributions[i], true);
                let size = DcatMapper.select('./dcat:byteSize', this.linkedDistributions[i], true);

                if(url) {
                    let distribution = {
                        format: UrlUtils.mapFormat([format], this.summary.warnings),
                        accessURL: url.getAttribute('rdf:resource'),
                        title: title ? title.textContent : undefined,
                        issued: issued ? new Date(issued.textContent) : undefined,
                        modified: modified ? new Date(modified.textContent) : undefined,
                        byteSize: size ? Number(size.textContent) : undefined
                    }

                    dists.push(distribution);
                }
            }
        }

        return dists;
    }


    async getPublisher(): Promise<any[]> {
        let publishers = [];

        let creators = DcatMapper.select('.//dct:creator', this.record);
        for (let i = 0; i < creators.length; i++) {
            let organization = DcatMapper.select('.//foaf:Organization', creators[i], true);
            if (organization) {
                let name = DcatMapper.select('.//foaf:name', organization, true);
                let infos: any = {
                    organization: name.textContent
                };

                publishers.push(infos);
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
        let title = DcatMapper.select('.//dct:title', this.record, true).textContent;
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
        let keywords = [];
        let keywordNodes = DcatMapper.select('./dcat:keyword', this.record);
        if (keywordNodes) {
            for (let i = 0; i < keywordNodes.length; i++) {
                keywords.push(keywordNodes[i].textContent)
            }
        }

        if(this.settings.filterTags && this.settings.filterTags.length > 0 && !keywords.some(keyword => this.settings.filterTags.includes(keyword))){
            this.skipped = true;
        }

        return keywords;
    }


    getMFundFKZ(): string {
        return undefined;
    }

    getMFundProjectTitle(): string {
        return undefined;
    }

    getMetadataIssued(): Date {
        return this.issued ? new Date(this.issued) : new Date(Date.now());
    }

    getMetadataSource(): any {
        let dcatLink;
        ; //=  DcatMapper.select('.//dct:creator', this.record);
        let portalLink = this.record.getAttribute('rdf:about');
        return {
            raw_data_source: dcatLink,
            portal_link: portalLink,
            attribution: this.settings.defaultAttribution
        };
    }

    getModifiedDate() {
        return new Date(DcatMapper.select('./dct:modified', this.record, true).textContent);
    }

    getTemporal(): DateRange {
        if (true) return undefined;
        let suffix = this.getErrorSuffix(this.uuid, this.getTitle());

        let nodes = DcatMapper.select('./*/gmd:extent/*/gmd:temporalElement/*/gmd:extent//gml:TimePeriod', this.record);
        if (nodes.length > 1) {
            this.log.warn(`Multiple time extents defined. Using only the first one. ${suffix}`);
        }
        if (nodes.length > 0) {
            let begin = this.getTimeValue(nodes, 'begin');
            let end = this.getTimeValue(nodes, 'end');

            if (begin || end) {
                return {
                    start: begin ? begin : undefined,
                    end: end ? end : undefined
                }
            }
        }

        // otherwise

        nodes = DcatMapper.select('./*/gmd:extent/*/gmd:temporalElement/*/gmd:extent//gml:TimeInstant/gml:timePosition', this.record);
        let times = nodes.map(node => node.textContent);
        if (times.length === 1) {
            return {
                start: new Date(times[0]),
                end: new Date(times[0])
            };
        } else if (times.length > 1) {
            this.log.warn(`Multiple time instants defined: [${times.join(', ')}]. ${suffix}`);
            return {
                custom: times
            };
        }
        return undefined;
    }

    getTimeValue(nodes, beginOrEnd: 'begin' | 'end'): Date {
        let dateNode = DcatMapper.select('./gml:' + beginOrEnd + 'Position', nodes[0], true);
        if (!dateNode) {
            dateNode = DcatMapper.select('./gml:' + beginOrEnd + '/*/gml:timePosition', nodes[0], true);
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
        let themes : string[] = DcatMapper.select('./dcat:theme', this.record)
            .map(node => node.getAttribute('rdf:resource'))
            .filter(theme => theme); // Filter out falsy values

        if(this.settings.filterGroups && this.settings.filterGroups.length > 0 && !themes.some(theme => this.settings.filterGroups.includes(theme.substr(theme.lastIndexOf('/')+1)))){
            this.skipped = true;
        }

        this.fetched.themes = themes;
        return themes;
    }

    isRealtime(): boolean {
        return undefined;
    }

    getAccrualPeriodicity(): string {
        // Multiple resourceMaintenance elements are allowed. If present, use the first one
        let freq = [];//DcatMapper.select('./*/gmd:resourceMaintenance/*/gmd:maintenanceAndUpdateFrequency/gmd:MD_MaintenanceFrequencyCode', this.record);
        if (freq.length > 0) {
            return freq[0].getAttribute('codeListValue');
        }
        return undefined;
    }

    async getLicense() {
        let license: License;

        let accessRights = DcatMapper.select('./dct:accessRights', this.record);
        if(accessRights){
            for(let i=0; i < accessRights.length; i++){
                try {
                    let json = JSON.parse(accessRights[i]);

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
        if(!license){
            for(let i = 0; i < this.linkedDistributions.length; i++) {
                let licenseResource = DcatMapper.select('dct:license', this.linkedDistributions[i], true);
                if(licenseResource) {
                    license = await DcatLicensesUtils.get(licenseResource.getAttribute('rdf:resource'));
                    break;
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
        return `Id: '${uuid}', title: '${title}', source: '${this.settings.catalogUrl}'.`;
    }

    getHarvestedData(): string {
        return this.record.toString();
    }

    getCreator(): Person[] {
        let creators = [];

        let creatorNodes = DcatMapper.select('.//dct:creator', this.record);
        for (let i = 0; i < creatorNodes.length; i++) {
            let organization = DcatMapper.select('.//foaf:Organization', creatorNodes[i], true);
            if (organization) {
                let name = DcatMapper.select('.//foaf:name', organization, true);
                let mbox = DcatMapper.select('.//foaf:mbox', organization, true);
                let infos: any = {
                    organization: name.textContent
                };
                if(mbox) infos.mbox = mbox.textContent;

                creators.push(infos);
            }
        }

        return creators.length === 0 ? undefined : creators;
    }


    getGroups(): string[] {
        return undefined;
    }

    getIssued(): Date {
        return new Date(DcatMapper.select('./dct:modified', this.record, true).textContent);
    }

    getMetadataHarvested(): Date {
        return new Date(Date.now());
    }

    getSubSections(): any[] {
        return undefined;
    }

    getOriginator(): Person[] {

        let originators = [];

        let originatorNode = DcatMapper.select('.//dcatde:originator', this.record);
        for (let i = 0; i < originatorNode.length; i++) {
            let organization = DcatMapper.select('.//foaf:Organization', originatorNode[i], true);
            if (organization) {
                let name = DcatMapper.select('.//foaf:name', organization, true);
                let mbox = DcatMapper.select('.//foaf:mbox', organization, true);
                let infos: any = {
                    organization: name.textContent
                };
                if(mbox) infos.mbox = mbox.textContent;

                originators.push(infos);
            }
        }

        return originators.length === 0 ? undefined : originators;
    }

    async getContactPoint(): Promise<any> {
        let contactPoint = this.fetched.contactPoint;
        if (contactPoint) {
            return contactPoint;
        }
        let infos: any = {};
        let contact = DcatMapper.select('./dcat:contactPoint', this.record, true);
        if (contact) {
            let name = DcatMapper.select('./vcard:Organization/vcard:fn', contact, true);
            let org = DcatMapper.select('./vcard:Organization/organization-name', contact, true);
            let region = DcatMapper.select('./vcard:Organization/vcard:region', contact, true);
            let country = DcatMapper.select('./vcard:Organization/vcard:hasCountryName', contact, true);
            let postCode = DcatMapper.select('./vcard:Organization/vcard:hasPostalCode', contact, true);
            let email = DcatMapper.select('./vcard:Organization/vcard:hasEmail', contact, true);
            let phone = DcatMapper.select('./vcard:Organization/vcard:hasTelephone', contact, true);
            let urlNode = DcatMapper.select('./vcard:Organization/vcard:hasURL', contact, true);
            let url = null;
            if (urlNode) {
                let requestConfig = this.getUrlCheckRequestConfig(urlNode.getAttribute('rdf:resource'));
                url = await UrlUtils.urlWithProtocolFor(requestConfig);
            }

            if (contact.getAttribute('uuid')) {
                infos.hasUID = contact.getAttribute('uuid');
            }

            if (name) infos.fn = name.textContent;
            if (org) infos['organization-name'] = org.textContent;

            if (region) infos.region = region.textContent;
            if (country) infos['country-name'] = country.textContent.trim();
            if (postCode) infos['postal-code'] = postCode.textContent;
            if (email) infos.hasEmail = email.getAttribute('rdf:resource').replace('mailto:','');
            if (phone) infos.hasTelephone = phone.getAttribute('rdf:resource').replace('tel:','');
            if (url) infos.hasURL = url;

        }

        this.fetched.contactPoint = infos;
        return infos;
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

}

// Private interface. Do not export
interface creatorType {
    name?: string;
    mbox?: string;
}
