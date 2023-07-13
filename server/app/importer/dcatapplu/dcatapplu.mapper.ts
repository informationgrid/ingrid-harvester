/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
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
import { BaseMapper } from "../base.mapper";
import { License } from '@shared/license.model';
import { getLogger } from "log4js";
import { UrlUtils } from "../../utils/url.utils";
import { MiscUtils } from "../../utils/misc.utils"
import { RequestDelegate, RequestOptions } from "../../utils/http-request.utils";
import { DcatappluSettings } from './dcatapplu.settings';
// import {DcatLicensesUtils} from "../../utils/dcat.licenses.utils";
import { throwError } from "rxjs";
import { ImporterSettings } from "../../importer.settings";
// import {DcatPeriodicityUtils} from "../../utils/dcat.periodicity.utils";
import { Summary } from "../../model/summary";
import { Contact, Person } from "../../model/agent";
import { Distribution } from "../../model/distribution";
import { DateRange } from "../../model/dateRange";
import { PluPlanState, PluPlanType, PluProcedureState, PluProcedureType, ProcessStep, PluProcessStepType, PluDocType, Catalog } from "../../model/dcatApPlu.model";

let xpath = require('xpath');

export class DcatappluMapper extends BaseMapper {

    static ADMS = 'http://www.w3.org/ns/adms#';
    static FOAF = 'http://xmlns.com/foaf/0.1/';
    static LOCN = 'http://www.w3.org/ns/locn#';
    static HYDRA = 'http://www.w3.org/ns/hydra/core#';
    static RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
    static RDFS = 'http://www.w3.org/2000/01/rdf-schema#';
    static DCAT = 'http://www.w3.org/ns/dcat#';
    static DCT = 'http://purl.org/dc/terms/';
    static SKOS = 'http://www.w3.org/2004/02/skos/core#';
    static SCHEMA = 'http://schema.org/';
    static VCARD = 'http://www.w3.org/2006/vcard/ns#';
    static DCATDE = 'http://dcat-ap.de/def/dcatde/';
    static OGC = 'http://www.opengis.net/rdf#'
    static PLU = 'https://specs.diplanung.de/plu/'

    static select = xpath.useNamespaces({
        'adms': DcatappluMapper.ADMS,
        'foaf': DcatappluMapper.FOAF,
        'locn': DcatappluMapper.LOCN,
        'hydra': DcatappluMapper.HYDRA,
        'rdf': DcatappluMapper.RDF,
        'rdfs': DcatappluMapper.RDFS,
        'dcat': DcatappluMapper.DCAT,
        'dct': DcatappluMapper.DCT,
        'skos': DcatappluMapper.SKOS,
        'schema': DcatappluMapper.SCHEMA,
        'vcard': DcatappluMapper.VCARD,
        'dcatde': DcatappluMapper.DCATDE,
        'ogc': DcatappluMapper.OGC,
        'plu': DcatappluMapper.PLU
    });

    private log = getLogger();

    private readonly record: any;
    private readonly catalogPage: any;
    private readonly linkedDistributions: any[];
    private readonly linkedProcessSteps: any[];
    private harvestTime: any;
    private readonly storedData: any;

    //    protected readonly idInfo; // : SelectedValue;
    private settings: DcatappluSettings;
    private readonly uuid: string;
    private summary: Summary;

    private keywordsAlreadyFetched = false;
    private fetched: any = {
        contactPoint: null,
        distributions: null,
        publishers: null,
        catalog: null,
        keywords: {},
        themes: null
    };


    constructor(settings, record, catalog, catalogPage, harvestTime, storedData, summary) {
        super();
        this.settings = settings;
        this.record = record;
        this.fetched.catalog = catalog;
        this.harvestTime = harvestTime;
        this.storedData = storedData;
        this.summary = summary;
        this.catalogPage = catalogPage;
        this.linkedDistributions = DcatappluMapper.select('./dcat:Distribution', catalogPage);
        this.linkedProcessSteps = DcatappluMapper.select('./plu:ProcessStep', catalogPage);

        let uuid = DcatappluMapper.select('./dct:identifier', record, true).textContent;
        if (!uuid) {
            uuid = DcatappluMapper.select('./dct:identifier/@rdf:resource', record, true).textContent;
        }
        this.uuid = uuid;

        super.init();
    }

    async _getContactPoint(): Promise<any> {
        let contactPoint = this.fetched.contactPoint;
        if (contactPoint) {
            return contactPoint;
        }
        let infos: Contact;
        let organization = DcatappluMapper.select('./dcat:contactPoint/vcard:Organization', this.record, true);
        if (organization) {
            infos = {
                fn: DcatappluMapper.select('./vcard:fn', organization, true)?.textContent ?? "",
                hasCountryName: DcatappluMapper.select('./vcard:hasCountryName', organization, true)?.textContent,
                hasLocality: DcatappluMapper.select('./vcard:hasLocality', organization, true)?.textContent,
                hasPostalCode: DcatappluMapper.select('./vcard:hasPostalCode', organization, true)?.textContent,
                hasRegion: DcatappluMapper.select('./vcard:hasRegion', organization, true)?.textContent,
                hasStreetAddress: DcatappluMapper.select('./vcard:hasStreetAddress', organization, true)?.textContent,
                hasEmail: DcatappluMapper.select('./vcard:hasEmail', organization, true)?.textContent,
                hasTelephone: DcatappluMapper.select('./vcard:hasTelephone', organization, true)?.textContent,
                hasUID: DcatappluMapper.select('./vcard:hasUID', organization, true)?.textContent,
                hasURL: DcatappluMapper.select('./vcard:hasURL', organization, true)?.textContent,
                hasOrganizationName: DcatappluMapper.select('./vcard:hasOrganizationName', organization, true)?.textContent
            };
        }
        this.fetched.contactPoint = infos;
        return infos;
    }

    _getDescription() {
        let description = DcatappluMapper.select('./dct:description', this.record, true)?.textContent;
        return description ?? "";
    }

    _getGeneratedId(): string {
        return this.uuid;
    }

    _getAdmsIdentifier(){
        let admsIdentifier = DcatappluMapper.select('./adms:identifier/adms:Identifier/skos:notation', this.record, true)?.textContent;
        return getUrlHashCode(admsIdentifier);
    }

    _getTitle() {
        let title = DcatappluMapper.select('./dct:title', this.record, true)?.textContent;
        return title ?? "";
    }
    
    _getAlternateTitle() {
        return this._getTitle();
    }

    _getPluPlanState() {
        let planState = DcatappluMapper.select('./plu:planState/@rdf:resource', this.record, true)?.textContent;
        return getUrlHashCode(planState) ?? PluPlanState.UNBEKANNT;
    }

    _getPluPlanType() {
        let planType = DcatappluMapper.select('./plu:planType/@rdf:resource', this.record, true)?.textContent;
        return getUrlHashCode(planType) ?? PluPlanType.UNBEKANNT;
    }

    _getPluPlanTypeFine() {
        let planTypeFine = DcatappluMapper.select('./plu:planTypeFine/@rdf:resource', this.record, true)?.textContent;
        return planTypeFine;
    }

    _getPluProcedureState() {
        let procedureState = DcatappluMapper.select('./plu:procedureState/@rdf:resource', this.record, true)?.textContent;
        return getUrlHashCode(procedureState) ?? PluProcedureState.UNBEKANNT;
    }

    _getPluProcedureType() {
        let procedureType = DcatappluMapper.select('./plu:procedureType/@rdf:resource', this.record, true)?.textContent;
        return getUrlHashCode(procedureType) ?? PluProcedureType.UNBEKANNT;
    }

    _getRelation() {
        let relation = DcatappluMapper.select('./dct:relation/@rdf:resource', this.record, true)?.textContent;
        return relation;
    }

    _getPluProcedureStartDate() {
        let procedureStartDate = DcatappluMapper.select('./plu:procedureStartDate', this.record, true)?.textContent;
        let startDate = MiscUtils.normalizeDateTime(procedureStartDate)
        return startDate; 
    }
    
    _getPluDevelopmentFreezePeriod() {
        let periodOfTime: any;
        let periodObject = DcatappluMapper.select('./plu:developmentFreezePeriod/dct:PeriodOfTime', this.record, true);
        if (periodObject) periodOfTime = this._getTemporalInternal(periodObject);
        return periodOfTime;
    }

    _getPluNotification(){
        let notification = DcatappluMapper.select('./plu:notification', this.record, true)?.textContent;
        return notification;
    }

    async _getPluProcessSteps() {
        let processSteps:any[] = []
        let processStepIDs = DcatappluMapper.select('./plu:processStep', this.record)
            .map(node => node.getAttribute('rdf:resource'))
            .filter(processStep => processStep);
        const linked = this.linkedProcessSteps.filter(processStep => processStepIDs.includes(processStep.getAttribute('rdf:about')) )
        const local = DcatappluMapper.select('./plu:processStep/plu:ProcessStep', this.record)        
        let pluProcessSteps:any[] = [...linked, ...local]
        pluProcessSteps?.map((step: any) => {
            let nodes: string[] = DcatappluMapper.select('./dct:temporal/dct:PeriodOfTime', step, true);
            let type =  getUrlHashCode(DcatappluMapper.select('./plu:ProcessStepType/@rdf:resource', step, true)?.textContent);
            let period = this._getTemporalInternal(nodes);
            let processStep: ProcessStep = {
                identifier: DcatappluMapper.select('./dct:identifier', step, true)?.textContent ?? undefined,
                type: type ?? PluProcessStepType.UNBEKANNT,
                distributions: this._getRelevantDistibutions(step),
                period: period?.[0]
            }
            processSteps.push(processStep);
        })
        return processSteps;
    }

    _getRelevantDistibutions(node){
        let distributions = [];
        let distributionIDs = DcatappluMapper.select('./dcat:distribution', node)
            .map(node => node.getAttribute('rdf:resource'))
            .filter(distribution => distribution);
        const linked = this.linkedDistributions.filter(distribution => distributionIDs.includes(distribution.getAttribute('rdf:about')) )
        const local = DcatappluMapper.select('./dcat:distribution/dcat:Distribution', node)    
        const relevantDistributions = [...linked, ...local]    
        relevantDistributions?.map((dist: any) => {
            let nodes: string[] = DcatappluMapper.select('./dct:temporal/dct:PeriodOfTime', dist, true);
            let period = this._getTemporalInternal(nodes);
            let distribution: Distribution = {
                accessURL: DcatappluMapper.select('./dcat:accessURL/@rdf:resource', dist, true)?.textContent ?? "",
                downloadURL: DcatappluMapper.select('./dcat:downloadURL/@rdf:resource', dist, true)?.textContent,
                title: DcatappluMapper.select('./dct:title', dist, true)?.textContent,
                description: DcatappluMapper.select('./dct:description', dist, true)?.textContent,
                issued: MiscUtils.normalizeDateTime(DcatappluMapper.select('./dct:issued', dist, true)?.textContent),
                modified: MiscUtils.normalizeDateTime(DcatappluMapper.select('./dct:modified', dist, true)?.textContent),
                pluDocType: getUrlHashCode(DcatappluMapper.select('./plu:docType/@rdf:resource', dist, true)?.textContent) ?? PluDocType.UNBEKANNT,
                period: period?.[0],
                mapLayerNames: [DcatappluMapper.select('./plu:mapLayerNames', dist, true)?.textContent ],
                format: [DcatappluMapper.select('./dct:format/@rdf:resource', dist, true)?.textContent ?? undefined],
            }
            distributions.push(distribution);
        })
        return distributions;
    }

    async _getDistributions(): Promise<Distribution[]> {
        let distributions = this._getRelevantDistibutions(this.record)
        return distributions
    }

    _getTemporalInternal(nodes: string[]): DateRange[] {
        let result: DateRange[] = [];
        if (nodes) {
            let begin = this.getTimeValue(nodes, 'startDate');
            let end = this.getTimeValue(nodes, 'endDate');
            if (begin || end) {
                result.push({
                    gte: begin ?? undefined,
                    lte: end ?? undefined
                });
            }
        }
        return result.length ? result : undefined;
    }

    _getTemporal(): DateRange[] {
        let nodes: string[] = DcatappluMapper.select('./dct:temporal/dct:PeriodOfTime', this.record, true);
        return this._getTemporalInternal(nodes) ?? undefined;
    }

    getTimeValue(node, beginOrEnd: 'startDate' | 'endDate'): Date {
        let dateNode = DcatappluMapper.select('./dcat:' + beginOrEnd, node, true);
        if (dateNode) {
            let text = dateNode?.textContent;
            let date = MiscUtils.normalizeDateTime(text);
            if (date) {
                return date;
            } else {
                this.log.warn(`Error parsing date, which was '${text}'. It will be ignored.`);
            }
        }
    }

    getAgent(nodes){
        let agents = [];
        nodes?.map((publisher: any) => {
            let agent = DcatappluMapper.select('./foaf:Agent', publisher, true);
            if (agent) {
                let infos: any = {
                    name: DcatappluMapper.select('./foaf:name', agent, true)?.textContent ?? undefined,
                    type: DcatappluMapper.select('./dct:type/@rdf:resource', agent, true)?.textContent ?? undefined
                };
                agents.push(infos);
            }
        })
        return agents.length ? agents : undefined
    }

    async _getPublisher(): Promise<any[]> {
        if (this.fetched.publishers != null) {
            return this.fetched.publishers
        }
        let node = DcatappluMapper.select('./dct:publisher', this.record);
        let publishers: any[] = this.getAgent(node)
        if (publishers.length === 0) {
            this.summary.missingPublishers++;
            return undefined;
        } else {
            this.fetched.publishers = publishers;
            return publishers;
        }
    }

    async _getMaintainers(): Promise<any[]> {
        let nodes = DcatappluMapper.select('./dcatde:maintainer', this.record);
        let maintainers: any[] = this.getAgent(nodes)
        return maintainers
    }
    async _getContributors(): Promise<any[]> {
        let nodes = DcatappluMapper.select('./dcatde:contributor', this.record);
        let maintainers: any[] = this.getAgent(nodes)
        return maintainers
    }

    _getHarvestedData(): string {
        return this.record.toString();
    }

    _getMetadataHarvested(): Date {
        return new Date(Date.now());
    }

    _getIssued(): Date {
        let issued = DcatappluMapper.select('./dct:modified', this.record, true);
        return issued ? MiscUtils.normalizeDateTime(issued.textContent) : undefined;
    }

    _getModifiedDate() {
        let modified = DcatappluMapper.select('./dct:modified', this.record, true);
        return modified ? MiscUtils.normalizeDateTime(modified.textContent) : undefined;
    }

    _getKeywords(): string[] {
        return undefined;
    }


    _getMetadataIssued(): Date {
        return (this.storedData && this.storedData.issued) ? MiscUtils.normalizeDateTime(this.storedData.issued) : new Date(Date.now());
    }
    
    _getMetadataModified(): Date {
        if (this.storedData && this.storedData.modified && this.storedData.dataset_modified) {
            let storedDataset_modified: Date = MiscUtils.normalizeDateTime(this.storedData.dataset_modified);
            if (storedDataset_modified.valueOf() === this.getModifiedDate().valueOf())
            return new Date(this.storedData.modified); 
        }
        return new Date(Date.now());
    }
    
    _getMetadataSource(): any {
        let dcatLink; //=  DcatappluMapper.select('.//dct:creator', this.record);
        let portalLink = this.record.getAttribute('rdf:about');
        return {
            raw_data_source: dcatLink,
            portal_link: portalLink,
            attribution: this.settings.defaultAttribution
        };
    }

    _getCatalog() {
        return this.fetched.catalog
    }

    _getSpatialText(): string {
        let geographicName = DcatappluMapper.select('./dct:spatial/dct:Location/locn:geographicName', this.record, true)?.textContent;
        return geographicName ?? undefined;
    }

    public getSettings(): ImporterSettings {
        return this.settings;
    }
    
    public getSummary(): Summary {
        return this.summary;
    }

    executeCustomCode(doc: any) {
        try {
            if (this.settings.customCode) {
                eval(this.settings.customCode); doc
            }
        } catch (error) {
            throwError('An error occurred in custom code: ' + error.message);
        }
    }
    

    // ------------------------------------------------------------- 
    // -------------------- ↓ return undefined ↓ ------------------- 
    // ------------------------------------------------------------- 
    
    _getAccessRights(): string[] { return undefined; }
    _getAccrualPeriodicity(): string { return undefined ;}
    _getCitation(): string { return undefined ;}
    _getGroups(): string[] { return undefined ;}
    _getSubSections(): any[] { return undefined ;}
    _isRealtime(): boolean { return undefined ;}

    _getCreator(): Person[] { return undefined ;} 
    _getLicense() { return undefined ;} 
    _getOriginator(): Person[]  { return undefined ;}
    _getThemes() { return undefined ;}
    _getUrlCheckRequestConfig(uri: string): RequestOptions { return undefined ;}

    // ---------------------- ↑ already checked ↑ ---------------------- 
    // ----------------------------------------------------------------- 
    // ----------------------------------------------------------------- 
    // ----------------------------------------------------------------- 
    // ---------------------- ↓ not yet checked ↓ ---------------------- 


    _getBoundingBox() {
        let bboxObject = DcatappluMapper.select('./dct:spatial/dct:Location/dcat:bbox[./@rdf:datatype="https://www.iana.org/assignments/media-types/application/vnd.geo+json"]', this.record, true);
        if (bboxObject) {
            return JSON.parse(bboxObject.textContent);
        }
        return undefined;
    }

    _getCentroid(): object {
        let centroid = DcatappluMapper.select('./dct:spatial/dct:Location/dcat:centroid[./@rdf:datatype="https://www.iana.org/assignments/media-types/application/vnd.geo+json"]', this.record, true);
        if (centroid) {
            return JSON.parse(centroid.textContent);
        }
        return undefined;
    }

    _getSpatial(): any {
        let geometry = DcatappluMapper.select('./dct:spatial/dct:Location/locn:geometry[./@rdf:datatype="https://www.iana.org/assignments/media-types/application/vnd.geo+json"]', this.record, true);
        if (geometry) {
            return JSON.parse(geometry.textContent);
        }
        return undefined;
    }

    // wktToGeoJson(wkt: string): any {
    //     try {
    //         var coordsPos = wkt.indexOf("(");
    //         var type = wkt.substring(0, coordsPos).trim();
    //         if (type.lastIndexOf(' ') > -1) {
    //             type = type.substring(type.lastIndexOf(' ')).trim();
    //         }
    //         type = type.toLowerCase();
    //         var coords = wkt.substring(coordsPos).trim();
    //         coords = coords.replace(/\(/g, "[").replace(/\)/g, "]");
    //         coords = coords.replace(/\[(\s*[-0-9][^\]]*\,[^\]]*[0-9]\s*)\]/g, "[[$1]]");
    //         coords = coords.replace(/([0-9])\s*\,\s*([-0-9])/g, "$1], [$2");
    //         coords = coords.replace(/([0-9])\s+([-0-9])/g, "$1, $2");
    //         return {
    //             'type': type,
    //             'coordinates': JSON.parse(coords)
    //         };
    //     } catch (e) {
    //         this.summary.appErrors.push("Can't parse WKT: " + e.message);
    //     }
    // }





  



    


    // ------------------------------------------------------------- 
    // --------------------- ↓ unused archive ↓ -------------------- 
    // ------------------------------------------------------------- 


    // async _getDisplayContacts() {
    //     let displayName;
    //     let displayHomepage;

    //     if (this.settings.dcatappluProviderField) {
    //         switch (this.settings.dcatappluProviderField) {
    //             case "contactPoint":
    //                 let contactPoint = await this.getContactPoint();
    //                 if (contactPoint) {

    //                     if (contactPoint['organization-name']) {
    //                         displayName = contactPoint['organization-name'];
    //                     } else if (contactPoint.fn) {
    //                         displayName = contactPoint.fn;
    //                     }

    //                     displayHomepage = contactPoint.hasURL
    //                 }
    //                 break;
    //             case "creator":
    //                 let creator = this.getCreator();
    //                 if (creator) {
    //                     displayName = creator[0].name;
    //                     displayHomepage = creator[0].homepage
    //                 }
    //                 break;
    //             // case "maintainer":
    //             //     let maintainer = this.getMaintainer();
    //             //     if (maintainer) {
    //             //         displayName = maintainer[0].name;
    //             //         displayHomepage = maintainer[0].homepage
    //             //     }
    //             //     break;
    //             case "originator":
    //                 let originator = this._getOriginator();
    //                 if (originator) {
    //                     displayName = originator[0].name;
    //                     displayHomepage = originator[0].homepage
    //                 }
    //                 break;
    //             case "publisher":
    //                 let publisher = await this._getPublisher();
    //                 if (publisher.length > 0) {
    //                     displayName = publisher[0].organization;
    //                     displayHomepage = null;
    //                 }
    //                 break;
    //         }
    //     }

    //     if (!displayName) {
    //         let contactPoint = await this.getContactPoint();
    //         if (contactPoint) {

    //             if (contactPoint['organization-name']) {
    //                 displayName = contactPoint['organization-name'];
    //             } else if (contactPoint.fn) {
    //                 displayName = contactPoint.fn;
    //             }

    //             displayHomepage = contactPoint.hasURL
    //         }
    //     }

    //     if (!displayName) {
    //         let publisher = await this.getPublisher();
    //         if (publisher && publisher[0]['organization']) {
    //             displayName = publisher[0]['organization'];
    //         }
    //     }

    //     if (!displayName) {
    //         let creator = this.getCreator();
    //         if (creator) {
    //             displayName = creator[0].name;
    //             displayHomepage = creator[0].homepage
    //         }
    //     }

    //     // if (!displayName) {
    //     //     let maintainer = this.getMaintainer();
    //     //     if (maintainer) {
    //     //         displayName = maintainer[0].name;
    //     //         displayHomepage = maintainer[0].homepage
    //     //     }
    //     // }

    //     if (!displayName) {
    //         let originator = this._getOriginator();
    //         if (originator) {
    //             displayName = originator[0].name;
    //             displayHomepage = originator[0].homepage
    //         }
    //     }

    //     if (!displayName) {
    //         displayName = this.settings.description.trim()
    //     }

    //     if (this.settings.providerPrefix) {
    //         displayName = this.settings.providerPrefix + displayName;
    //     }

    //     let displayContact: Person = {
    //         name: displayName.trim(),
    //         homepage: displayHomepage
    //     };

    //     return [displayContact];
    // }

    // _getThemes() {
    //     // Return cached value, if present
    //     if (this.fetched.themes) return this.fetched.themes;

    //     // Evaluate the themes
    //     let themes: string[] = DcatappluMapper.select('./dcat:theme', this.record)
    //         .map(node => node.getAttribute('rdf:resource'))
    //         .filter(theme => theme); // Filter out falsy values

    //     if (this.settings.filterThemes && this.settings.filterThemes.length > 0 && !themes.some(theme => this.settings.filterThemes.includes(theme.substr(theme.lastIndexOf('/') + 1)))) {
    //         this.skipped = true;
    //     }

    //     this.fetched.themes = themes;
    //     return themes;
    // }


    // async _getLicense() {
    //     let license: License;
    //     //     let accessRights = DcatappluMapper.select('./dct:accessRights', this.record);
    //     //     if(accessRights){
    //     //         for(let i=0; i < accessRights.length; i++){
    //     //             try {
    //     //                 let json = JSON.parse(accessRights[i]);

    //     //                 if (!json.id || !json.url) continue;

    //     //                 let requestConfig = this.getUrlCheckRequestConfig(json.url);
    //     //                 license = {
    //     //                     id: json.id,
    //     //                     title: json.name,
    //     //                     url: await UrlUtils.urlWithProtocolFor(requestConfig, this.settings.skipUrlCheckOnHarvest)
    //     //                 };

    //     //             } catch(ignored) {}

    //     //         }
    //     //     }
    //     //     if(!license){
    //     //         for(let i = 0; i < this.linkedDistributions.length; i++) {
    //     //             let licenseResource = DcatappluMapper.select('dct:license', this.linkedDistributions[i], true);
    //     //             if(licenseResource) {
    //     //                 license = await DcatLicensesUtils.get(licenseResource.getAttribute('rdf:resource'));
    //     //                 break;
    //     //             }
    //     //         }
    //     //     }

    //     //     if (!license) {
    //     //         let msg = `No license detected for dataset. ${this.getErrorSuffix(this.uuid, this.getTitle())}`;
    //     //         this.summary.missingLicense++;

    //     //         this.log.warn(msg);
    //     //         this.summary.warnings.push(['Missing license', msg]);
    //     //         return {
    //     //             id: 'unknown',
    //     //             title: 'Unbekannt',
    //     //             url: undefined
    //     //         };
    //     //     }

    //     return license;
    // }

    // getErrorSuffix(uuid, title) {
    //     return `Id: '${uuid}', title: '${title}', source: '${this.settings.catalogUrl}'.`;
    // }

    // _getCreator(): Person[] {
    //     let creators = [];
    //     let creatorNodes = DcatappluMapper.select('./dct:creator', this.record);
    //     for (let i = 0; i < creatorNodes.length; i++) {
    //         let organization = DcatappluMapper.select('./foaf:Organization', creatorNodes[i], true);
    //         if (organization) {
    //             let name = DcatappluMapper.select('./foaf:name', organization, true);
    //             let mbox = DcatappluMapper.select('./foaf:mbox', organization, true);
    //             if (name) {
    //                 let infos: any = {
    //                     name: name.textContent
    //                 };
    //                 if (mbox) infos.mbox = mbox.textContent;
    //                 creators.push(infos);
    //             }
    //         }
    //     }
    //     return creators.length === 0 ? undefined : creators;
    // }


    // _getOriginator(): Person[] {
    //     let originators = [];
    //     let originatorNode = DcatappluMapper.select('./dcatde:originator', this.record);
    //     for (let i = 0; i < originatorNode.length; i++) {
    //         let organization = DcatappluMapper.select('./foaf:Organization', originatorNode[i], true);
    //         if (organization) {
    //             let name = DcatappluMapper.select('./foaf:name', organization, true);
    //             let mbox = DcatappluMapper.select('./foaf:mbox', organization, true);
    //             let infos: any = {
    //                 name: name.textContent
    //             };
    //             if (mbox) infos.mbox = mbox.textContent;
    //             originators.push(infos);
    //         }
    //     }
    //     return originators.length === 0 ? undefined : originators;
    // }

    // _getUrlCheckRequestConfig(uri: string): RequestOptions {
    //     let config: RequestOptions = {
    //         method: 'HEAD',
    //         json: false,
    //         headers: RequestDelegate.defaultRequestHeaders(),
    //         qs: {},
    //         uri: uri
    //     };

    //     if (this.settings.proxy) {
    //         config.proxy = this.settings.proxy;
    //     }

    //     return config;
    // }

    // protected getUuid(): string {
    //     return this.uuid;
    // }



}

function getUrlHashCode(string:any){
    return string?.split("#")?.pop();
}