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
import {throwError} from "rxjs";
import {ImporterSettings} from "../../importer.settings";
import {DcatPeriodicityUtils} from "../../utils/dcat.periodicity.utils";

let xpath = require('xpath');

export class DcatMapper extends GenericMapper {

    static FOAF = 'http://xmlns.com/foaf/0.1/';
    static LOCN = 'http://www.w3.org/ns/locn#';
    static HYDRA = 'http://www.w3.org/ns/hydra/core#';
    static RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
    static DCAT = 'http://www.w3.org/ns/dcat#';
    static DCT = 'http://purl.org/dc/terms/';
    static SKOS = 'http://www.w3.org/2004/02/skos/core#';
    static SCHEMA = 'http://schema.org/';
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
        'schema': DcatMapper.SCHEMA,
        'vcard': DcatMapper.VCARD,
        'dcatde': DcatMapper.DCATDE
    });

    private log = getLogger();

    private readonly record: any;
    private readonly catalogPage: any;
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


    constructor(settings, record, catalogPage, harvestTime, issued, summary) {
        super();
        this.settings = settings;
        this.record = record;
        this.harvestTime = harvestTime;
        this.issued = issued;
        this.summary = summary;
        this.catalogPage = catalogPage;




        let distributions = DcatMapper.select('./dcat:Distribution', catalogPage);
        let distributionIDs = DcatMapper.select('./dcat:distribution', record)
            .map(node => node.getAttribute('rdf:resource'))
            .filter(distibution => distibution);

        this.linkedDistributions = distributions.filter(distribution => distributionIDs.includes(distribution.getAttribute('rdf:about')))

        this.uuid = DcatMapper.select('.//dct:identifier', record, true).textContent;
    }

    protected getSettings(): ImporterSettings {
        return this.settings;
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
                    if(format.startsWith("http://publications.europa.eu/resource/authority/file-type/")){
                        format = format.substring("http://publications.europa.eu/resource/authority/file-type/".length)
                    }
                }

                let url = DcatMapper.select('./dcat:accessURL', this.linkedDistributions[i], true);
                let title = DcatMapper.select('./dct:title', this.linkedDistributions[i], true);
                let description = DcatMapper.select('./dct:description', this.linkedDistributions[i], true);
                let issued = DcatMapper.select('./dct:issued', this.linkedDistributions[i], true);
                let modified = DcatMapper.select('./dct:modified', this.linkedDistributions[i], true);
                let size = DcatMapper.select('./dcat:byteSize', this.linkedDistributions[i], true);

                if(url) {
                    let distribution = {
                        format: UrlUtils.mapFormat([format], this.summary.warnings),
                        accessURL: url.getAttribute('rdf:resource'),
                        title: title ? title.textContent : undefined,
                        description: description ? description.textContent : undefined,
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
                if(name) {
                    let infos: any = {
                        organization: name.textContent
                    };

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


        let displayName;
        let displayHomepage;

        if(this.settings.dcatProviderField) {
            switch (this.settings.dcatProviderField) {
                case "contactPoint":
                    let contactPoint = await this.getContactPoint();
                    if (contactPoint) {

                        if (contactPoint['organization-name']) {
                            displayName = contactPoint['organization-name'];
                        } else if (contactPoint.fn) {
                            displayName = contactPoint.fn;
                        }

                        displayHomepage = contactPoint.hasURL
                    }
                    break;
                case "creator":
                    let creator = this.getCreator();
                    if (creator) {
                        displayName = creator[0].name;
                        displayHomepage = creator[0].homepage
                    }
                    break;
                case "maintainer":
                    let maintainer = this.getMaintainer();
                    if (maintainer) {
                        displayName = maintainer[0].name;
                        displayHomepage = maintainer[0].homepage
                    }
                    break;
                case "originator":
                    let originator = this.getOriginator();
                    if (originator) {
                        displayName = originator[0].name;
                        displayHomepage = originator[0].homepage
                    }
                    break;
            }
        }

        if(!displayName){
            let contactPoint = await this.getContactPoint();
            if (contactPoint) {

                if (contactPoint['organization-name']) {
                    displayName = contactPoint['organization-name'];
                } else if (contactPoint.fn) {
                    displayName = contactPoint.fn;
                }

                displayHomepage = contactPoint.hasURL
            }
        }

        if(!displayName){
            let creator = this.getCreator();
            if (creator) {
                displayName = creator[0].name;
                displayHomepage = creator[0].homepage
            }
        }

        if(!displayName) {
            let maintainer = this.getMaintainer();
            if (maintainer) {
                displayName = maintainer[0].name;
                displayHomepage = maintainer[0].homepage
            }
        }

        if(!displayName) {
            let originator = this.getOriginator();
            if (originator) {
                displayName = originator[0].name;
                displayHomepage = originator[0].homepage
            }
        }

        if(!displayName) {
            displayName = this.settings.description.trim()
        }

        if(this.settings.providerPrefix){
            displayName = this.settings.providerPrefix+displayName;
        }

        let displayContact: Person = {
            name: displayName.trim(),
            homepage: displayHomepage
        };

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
        let dcatLink; //=  DcatMapper.select('.//dct:creator', this.record);
        let portalLink = this.record.getAttribute('rdf:about');
        return {
            raw_data_source: dcatLink,
            portal_link: portalLink,
            attribution: this.settings.defaultAttribution
        };
    }

    getModifiedDate() {
        let modified = DcatMapper.select('./dct:modified', this.record, true);
        return modified?new Date(modified.textContent):undefined;
    }

    getSpatial(): any {
        let geometry = DcatMapper.select('./dct:spatial/dct:Location/locn:geometry[./@rdf:datatype="https://www.iana.org/assignments/media-types/application/vnd.geo+json"]', this.record, true);
        if(geometry){
            return JSON.parse(geometry.textContent);
        }
        return undefined;
    }

    getSpatialText(): string {
        let prefLabel = DcatMapper.select('./dct:spatial/dct:Location/skos:prefLabel', this.record, true);
        if(prefLabel){
            return prefLabel.textContent;
        }
        return undefined;
    }

    getTemporal(): DateRange[] {
        let result: DateRange[] = [];

        let nodes : string[] = DcatMapper.select('./dct:temporal/dct:PeriodOfTime', this.record)
        for (let i = 0; i < nodes.length; i++) {
            let begin = this.getTimeValue(nodes[i], 'startDate');
            let end = this.getTimeValue(nodes[i], 'endDate');

            if (begin || end) {
                result.push({
                    gte: begin ? begin : undefined,
                    lte: end ? end : undefined
                });
            }
        }

        if(result.length)
            return result;

        return undefined;
    }

    getTimeValue(node, beginOrEnd: 'startDate' | 'endDate'): Date {
        let dateNode = DcatMapper.select('./schema:' + beginOrEnd, node, true);
        if (dateNode) {
            let text = dateNode.textContent;
            let date = new Date(Date.parse(text));
            if (date) {
                return date;
            } else {
                this.log.warn(`Error parsing date, which was '${text}'. It will be ignored.`);
            }
        }
    }


    getThemes() {
        // Return cached value, if present
        if (this.fetched.themes) return this.fetched.themes;

        // Evaluate the themes
        let themes : string[] = DcatMapper.select('./dcat:theme', this.record)
            .map(node => node.getAttribute('rdf:resource'))
            .filter(theme => theme); // Filter out falsy values

        if(this.settings.filterThemes && this.settings.filterThemes.length > 0 && !themes.some(theme => this.settings.filterThemes.includes(theme.substr(theme.lastIndexOf('/')+1)))){
            this.skipped = true;
        }

        this.fetched.themes = themes;
        return themes;
    }

    isRealtime(): boolean {
        return undefined;
    }

    getAccrualPeriodicity(): string {
        let accrualPeriodicity = DcatMapper.select('./dct:accrualPeriodicity', this.record, true);
        if (accrualPeriodicity) {
            let res = accrualPeriodicity.getAttribute('rdf:resource');
            let periodicity;
            if(res.length > 0)
                periodicity =  res.substr(res.lastIndexOf('/') + 1);
            else if(accrualPeriodicity.textContent.trim().length > 0)
                periodicity =  accrualPeriodicity.textContent;


            if(periodicity){
                let period = DcatPeriodicityUtils.getPeriodicity(periodicity)
                if(!period){
                    this.summary.warnings.push(["Unbekannte Periodizität", periodicity]);
                }
                return period;
            }
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
                if(name) {
                    let infos: any = {
                        name: name.textContent
                    };
                    if (mbox) infos.mbox = mbox.textContent;

                    creators.push(infos);
                }
            }
        }

        return creators.length === 0 ? undefined : creators;
    }

    getMaintainer(): Person[] {
        let maintainers = [];

        let maintainerNodes = DcatMapper.select('.//dct:maintainer', this.record);
        for (let i = 0; i < maintainerNodes.length; i++) {
            let organization = DcatMapper.select('.//foaf:Organization', maintainerNodes[i], true);
            if (organization) {
                let name = DcatMapper.select('.//foaf:name', organization, true);
                let mbox = DcatMapper.select('.//foaf:mbox', organization, true);
                if(name) {
                    let infos: any = {
                        name: name.textContent
                    };
                    if (mbox) infos.mbox = mbox.textContent;

                    maintainers.push(infos);
                }
            }
        }

        return maintainers.length === 0 ? undefined : maintainers;
    }

    getGroups(): string[] {
        return undefined;
    }

    getIssued(): Date {
        let modified = DcatMapper.select('./dct:modified', this.record, true);
        return modified?new Date(modified.textContent):undefined;
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
                    name: name.textContent
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
            let organization = DcatMapper.select('./vcard:Organization', contact, true);
            if(contact.getAttribute('rdf:resource')){
                organization = DcatMapper.select('(vcard:Organization[./@rdf:about="'+contact.getAttribute('rdf:resource')+'"]|./*/*/vcard:Organization[./@rdf:about="'+contact.getAttribute('rdf:resource')+'"])', this.catalogPage, true)
            }
            if(organization) {
                let name = DcatMapper.select('./vcard:fn', organization, true);
                let org = DcatMapper.select('./organization-name', organization, true);
                let region = DcatMapper.select('./vcard:region', organization, true);
                let country = DcatMapper.select('./vcard:hasCountryName', organization, true);
                let postCode = DcatMapper.select('./vcard:hasPostalCode', organization, true);
                let email = DcatMapper.select('./vcard:hasEmail', organization, true);
                let phone = DcatMapper.select('./vcard:hasTelephone', organization, true);
                let urlNode = DcatMapper.select('./vcard:hasURL', organization, true);
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
                if (email) infos.hasEmail = email.getAttribute('rdf:resource').replace('mailto:', '');
                if (phone) infos.hasTelephone = phone.getAttribute('rdf:resource').replace('tel:', '');
                if (url) infos.hasURL = url;
            }

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

    executeCustomCode(doc: any) {
        try {
            if (this.settings.customCode) {
                eval(this.settings.customCode);doc
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
