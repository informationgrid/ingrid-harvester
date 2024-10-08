/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2024 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or - as soon they will be
 * approved by the European Commission - subsequent versions of the
 * EUPL (the "Licence");
 *
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the Licence is distributed on an "AS IS" basis,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and
 * limitations under the Licence.
 * ==================================================
 */

/**
 * A mapper for ISO-XML documents harvested over CSW.
 */
import * as xpath from 'xpath';
import { getLogger } from 'log4js';
import { namespaces } from '../../importer/namespaces';
import { throwError } from 'rxjs';
import { BaseMapper } from '../base.mapper';
import { Contact, Person } from '../../model/agent';
import { DateRange } from '../../model/dateRange';
import { DcatLicensesUtils } from '../../utils/dcat.licenses.utils';
import { DcatPeriodicityUtils } from '../../utils/dcat.periodicity.utils';
import { DcatSettings } from './dcat.settings';
import { Distribution } from '../../model/distribution';
import { ImporterSettings } from '../../importer.settings';
import { License } from '@shared/license.model';
import { MetadataSource } from '../../model/index.document';
import { RequestDelegate, RequestOptions } from '../../utils/http-request.utils';
import { Summary } from '../../model/summary';
import { UrlUtils } from '../../utils/url.utils';
import { XPathElementSelect } from '../../utils/xpath.utils';

export class DcatMapper extends BaseMapper {

    static DCAT_CATEGORY_URL = 'http://publications.europa.eu/resource/authority/data-theme/';

    static DCAT_THEMES = ['AGRI', 'ECON', 'EDUC','ENER','ENVI','GOVE','HEAL','INTR','JUST','REGI','SOCI','TECH','TRAN'];

    // TODO: refactor into a mapping file
    static dcatThemeUriFromKeyword(keyword: string): string {
        // Check falsy values first
        if (!keyword) return null;

        let code: string = null;
        keyword = keyword.trim();

        switch (keyword) {
            case 'Landwirtschaft, Fischerei, Forstwirtschaft und Nahrungsmittel':
                code = 'AGRI';
                break;
            case 'Wirtschaft und Finanzen':
                code = 'ECON';
                break;
            case 'Bildung, Kultur und Sport':
                code = 'EDUC';
                break;
            case 'Energie':
                code = 'ENER';
                break;
            case 'Umwelt':
                code = 'ENVI';
                break;
            case 'Regierung und öffentlicher Sektor':
                code = 'GOVE';
                break;
            case 'Gesundheit':
                code = 'HEAL';
                break;
            case 'Internationale Themen':
                code = 'INTR';
                break;
            case 'Justiz, Rechtssystem und öffentliche Sicherheit':
                code = 'JUST';
                break;
            case 'Regionen und Städte':
                code = 'REGI';
                break;
            case 'Bevölkerung und Gesellschaft':
                code = 'SOCI';
                break;
            case 'Wissenschaft und Technologie':
                code = 'TECH';
                break;
            case 'Verkehr':
                code = 'TRAN';
                break;
            default:
                return null;
        }
        return code;// ? GenericMapper.DCAT_CATEGORY_URL + code : null;
    }

    static select = <XPathElementSelect>xpath.useNamespaces({
        'foaf': namespaces.FOAF,
        'locn': namespaces.LOCN,
        'hydra': namespaces.HYDRA,
        'rdf': namespaces.RDF,
        'rdfs': namespaces.RDFS,
        'dcat': namespaces.DCAT,
        'dct': namespaces.DCT,
        'skos': namespaces.SKOS,
        'schema': namespaces.SCHEMA,
        'vcard': namespaces.VCARD,
        'dcatde': namespaces.DCATDE,
        'ogc': namespaces.OGC
    });

    private readonly record: any;
    private readonly catalogPage: any;
    private readonly linkedDistributions: any;
    private harvestTime: any;

//    protected readonly idInfo; // : SelectedValue;
    private settings: DcatSettings;
    private readonly uuid: string;
    private summary: Summary;

    private keywordsAlreadyFetched = false;
    private fetched: any = {
        contactPoint: null,
        publishers: null,
        keywords: {},
        themes: null
    };

    log = getLogger();

    constructor(settings, record, catalogPage, harvestTime, summary) {
        super();
        this.settings = settings;
        this.record = record;
        this.harvestTime = harvestTime;
        this.summary = summary;
        this.catalogPage = catalogPage;

        let distributions = DcatMapper.select('./dcat:Distribution', catalogPage);
        let distributionIDs = DcatMapper.select('./dcat:distribution', record)
            .map(node => node.getAttribute('rdf:resource'))
            .filter(distibution => distibution);

        this.linkedDistributions = distributions.filter(distribution => distributionIDs.includes(distribution.getAttribute('rdf:about')))

        let uuid = DcatMapper.select('./dct:identifier', record, true).textContent;
        if(!uuid) {
            uuid = DcatMapper.select('./dct:identifier/@rdf:resource', record, true).textContent;
        }
        this.uuid = uuid;

            super.init();
    }

    public getSettings(): ImporterSettings {
        return this.settings;
    }

    public getSummary(): Summary{
        return this.summary;
    }

    getDescription() {
        let description = DcatMapper.select('./dct:description', this.record, true);
        if (!description) {
            description = DcatMapper.select('./dct:abstract', this.record, true);
        }
        if (!description) {
            let msg = `Dataset doesn't have an description. It will not be displayed in the portal. Id: \'${this.uuid}\', title: \'${this.getTitle()}\', source: \'${this.settings.sourceURL}\'`;
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
                let mediaTypeNode = DcatMapper.select('./dcat:mediaType', this.linkedDistributions[i], true);
                if (formatNode) {
                    let formatLabel = DcatMapper.select('.//rdfs:label', formatNode, true);
                    let formatValue = DcatMapper.select('.//rdf:value', formatNode, true);
                    if(formatLabel){
                        format = formatLabel.textContent;
                    }
                    else if(formatValue){
                        format = formatValue.textContent;
                    }
                    else if (formatNode.textContent) {
                        format = formatNode.textContent.trim();
                    } else {
                        format = formatNode.getAttribute('rdf:resource');
                    }
                    if(format.startsWith("http://publications.europa.eu/resource/authority/file-type/")){
                        format = format.substring("http://publications.europa.eu/resource/authority/file-type/".length)
                    }
                } else if (mediaTypeNode) {
                    if (mediaTypeNode.textContent) {
                        format = mediaTypeNode.textContent;
                    } else {
                        format = mediaTypeNode.getAttribute('rdf:resource');
                    }
                    if(format.startsWith("https://www.iana.org/assignments/media-types/")){
                        format = format.substring("https://www.iana.org/assignments/media-types/".length)
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
                        accessURL: url.getAttribute('rdf:resource')?url.getAttribute('rdf:resource'):url.textContent,
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
        if(this.fetched.publishers != null){
            return this.fetched.publishers
        }

        let publishers = [];

        let dctPublishers = DcatMapper.select('./dct:publisher', this.record);
        for (let i = 0; i < dctPublishers.length; i++) {
            let organization = DcatMapper.select('./foaf:Organization', dctPublishers[i], true);
            if(!organization){
                organization = DcatMapper.select('./foaf:Organization[@rdf:about="'+dctPublishers[i].getAttribute('rdf:resource')+'"]', this.catalogPage, true)
            }
            if (organization) {
                let name = DcatMapper.select('./foaf:name', organization, true);
                if(name) {
                    let infos: any = {
                        organization: name.textContent
                    };

                    publishers.push(infos);
                }
            }
        }

        if (publishers.length === 0) {
            let creators = DcatMapper.select('./dct:creator', this.record);
            for (let i = 0; i < creators.length; i++) {
                let organization = DcatMapper.select('./foaf:Organization', creators[i], true);
                if (organization) {
                    let name = DcatMapper.select('./foaf:name', organization, true);
                    if (name) {
                        let infos: any = {
                            organization: name.textContent
                        };

                        publishers.push(infos);
                    }
                }
            }
        }

        if (publishers.length === 0) {
            this.summary.missingPublishers++;
            return undefined;
        } else {
            this.fetched.publishers = publishers;
            return publishers;
        }
    }

    getTitle() {
        let title = DcatMapper.select('./dct:title', this.record, true).textContent;
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
                case "publisher":
                    let publisher = await this.getPublisher();
                    if (publisher.length > 0) {
                        displayName = publisher[0].organization;
                        displayHomepage = null;
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
            let publisher = await this.getPublisher();
            if (publisher && publisher[0]['organization']) {
                displayName = publisher[0]['organization'];
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

    getMetadataSource(): MetadataSource {
        let dcatLink; //=  DcatMapper.select('.//dct:creator', this.record);
        let portalLink = this.record.getAttribute('rdf:about');
        return {
            source_base: this.settings.sourceURL,
            raw_data_source: dcatLink,
            source_type: 'dcat',
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
        geometry = DcatMapper.select('./dct:spatial/ogc:Polygon/ogc:asWKT[./@rdf:datatype="http://www.opengis.net/rdf#WKTLiteral"]', this.record, true);
        if(geometry){
            return this.wktToGeoJson(geometry.textContent);
        }
        return undefined;
    }

    wktToGeoJson(wkt: string):any{
        try {
            var coordsPos = wkt.indexOf("(");
            var type = wkt.substring(0, coordsPos).trim();
            if(type.lastIndexOf(' ') > -1){
                type = type.substring(type.lastIndexOf(' ')).trim();
            }
            type = type.toLowerCase();
            var coords = wkt.substring(coordsPos).trim();
            coords = coords.replace(/\(/g, "[").replace(/\)/g, "]");
            coords = coords.replace(/\[(\s*[-0-9][^\]]*\,[^\]]*[0-9]\s*)\]/g, "[[$1]]");
            coords = coords.replace(/([0-9])\s*\,\s*([-0-9])/g, "$1], [$2");
            coords = coords.replace(/([0-9])\s+([-0-9])/g, "$1, $2");
            return {
                'type': type,
                'coordinates': JSON.parse(coords)
            };
        } catch(e) {
            this.summary.appErrors.push("Can't parse WKT: "+e.message);
        }
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

        let nodes = DcatMapper.select('./dct:temporal/dct:PeriodOfTime', this.record);
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

    async getLicense(): Promise<License> {
        let license: License;

        let accessRights = DcatMapper.select('./dct:accessRights', this.record);
        if(accessRights){
            for(let i=0; i < accessRights.length; i++){
                try {
                    let json = JSON.parse(accessRights[i]?.textContent);

                    if (!json.id || !json.url) continue;

                    let requestConfig = this.getUrlCheckRequestConfig(json.url);
                    license = {
                        id: json.id,
                        title: json.name,
                        url: await UrlUtils.urlWithProtocolFor(requestConfig, this.settings.skipUrlCheckOnHarvest)
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
        return `Id: '${uuid}', title: '${title}', source: '${this.settings.sourceURL}'.`;
    }

    getHarvestedData(): string {
        return this.record.toString();
    }

    getCreator(): Person[] {
        let creators = [];

        let creatorNodes = DcatMapper.select('./dct:creator', this.record);
        for (let i = 0; i < creatorNodes.length; i++) {
            let organization = DcatMapper.select('./foaf:Organization', creatorNodes[i], true);
            if (organization) {
                let name = DcatMapper.select('./foaf:name', organization, true);
                let mbox = DcatMapper.select('./foaf:mbox', organization, true);
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

        let maintainerNodes = DcatMapper.select('./dct:maintainer', this.record);
        for (let i = 0; i < maintainerNodes.length; i++) {
            let organization = DcatMapper.select('./foaf:Organization', maintainerNodes[i], true);
            if (organization) {
                let name = DcatMapper.select('./foaf:name', organization, true);
                let mbox = DcatMapper.select('./foaf:mbox', organization, true);
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

    getHarvestingDate(): Date {
        return new Date(Date.now());
    }

    getSubSections(): any[] {
        return undefined;
    }

    getOriginator(): Person[] {
        let originators = [];
        let originatorNode = DcatMapper.select('./dcatde:originator', this.record);
        for (let i = 0; i < originatorNode.length; i++) {
            let organization = DcatMapper.select('./foaf:Organization', originatorNode[i], true);
            if (organization) {
                let name = DcatMapper.select('./foaf:name', organization, true);
                let mbox = DcatMapper.select('./foaf:mbox', organization, true);
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
                    url = await UrlUtils.urlWithProtocolFor(requestConfig, this.settings.skipUrlCheckOnHarvest);
                }

                let infos: Contact = {
                    fn: name?.textContent,
                };                 

                if (contact.getAttribute('uuid')) {
                    infos.hasUID = contact.getAttribute('uuid');
                }

                if (org) infos['organization-name'] = org.textContent;

                if (region) infos.hasRegion = region.textContent;
                if (country) infos.hasCountryName = country.textContent.trim();
                if (postCode) infos.hasPostalCode = postCode.textContent;

                if (email) infos.hasEmail = email.getAttribute('rdf:resource').replace('mailto:', '');
                if (phone) infos.hasTelephone = phone.getAttribute('rdf:resource').replace('tel:', '');
                if (url) infos.hasURL = url;
            }

        }

        this.fetched.contactPoint = infos;
        return infos;
    }

    private getUrlCheckRequestConfig(uri: string): RequestOptions {
        let config: RequestOptions = {
            method: 'HEAD',
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
