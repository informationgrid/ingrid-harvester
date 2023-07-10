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
import { PluPlanState, PluPlanType, PluProcedureState, PluProcedureType, ProcessStep, PluProcessStepType, PluDocType } from "../../model/dcatApPlu.model";

let xpath = require('xpath');

export class DcatappluMapper extends BaseMapper {

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
    static PLU = 'http://a.placeholder.url.for.dcat-ap-plu/'

    static select = xpath.useNamespaces({
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
    // private readonly linkedDatasetDistributions: any;
    // private readonly linkedProcessStepDistributions: any;
    // private readonly linkedProcessSteps: any;
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
        keywords: {},
        themes: null
    };


    constructor(settings, record, catalogPage, harvestTime, storedData, summary) {
        super();
        this.settings = settings;
        this.record = record;
        this.harvestTime = harvestTime;
        this.storedData = storedData;
        this.summary = summary;
        this.catalogPage = catalogPage;
        this.linkedDistributions = DcatappluMapper.select('./dcat:Distribution', catalogPage);
        this.linkedProcessSteps = DcatappluMapper.select('./plu:ProcessStep', catalogPage);

        // let processSteps = DcatappluMapper.select('./plu:ProcessStep', catalogPage);
        // let processStepIDs = DcatappluMapper.select('./plu:processStep', record)
        //     .map(node => node.getAttribute('rdf:resource'))
        //     .filter(processStep => processStep);
        // this.linkedProcessSteps = processSteps.filter(processStep => processStepIDs.includes(processStep.getAttribute('rdf:about')))

        // let distributions = DcatappluMapper.select('./dcat:Distribution', catalogPage);

        // let datasetDistributionIDs = DcatappluMapper.select('./dcat:distribution', record)
        //     .map(node => node.getAttribute('rdf:resource'))
        //     .filter(distibution => distibution);
        // this.linkedDatasetDistributions = distributions.filter(distribution => datasetDistributionIDs.includes(distribution.getAttribute('rdf:about')))

        // let processStepDistributionIDs = DcatappluMapper.select('./plu:ProcessStep/dcat:distribution', record)
        //     .map(node => node.getAttribute('rdf:resource'))
        //     .filter(distibution => distibution);
        // this.linkedProcessStepDistributions = distributions.filter(distribution => processStepDistributionIDs.includes(distribution.getAttribute('rdf:about')))

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

    _getTitle() {
        let title = DcatappluMapper.select('./dct:title', this.record, true)?.textContent;
        return title ?? "";
    }

    _getAlternateTitle() {
        return this._getTitle();
    }

    _getPluPlanState() {
        let planState = DcatappluMapper.select('./plu:planState', this.record, true)?.textContent;
        return planState ?? PluPlanState.UNBEKANNT;
    }

    _getPluPlanType() {
        let planType = DcatappluMapper.select('./plu:planType', this.record, true)?.textContent;
        return planType ?? PluPlanType.UNBEKANNT;
    }

    _getPluPlanTypeFine() {
        let planTypeFine = DcatappluMapper.select('./plu:planTypeFine', this.record, true)?.textContent;
        return planTypeFine ?? "";
    }

    _getPluProcedureState() {
        let procedureState = DcatappluMapper.select('./plu:procedureState', this.record, true)?.textContent;
        return procedureState ?? PluProcedureState.UNBEKANNT;
    }

    _getPluProcedureType() {
        let procedureType = DcatappluMapper.select('./plu:procedureType', this.record, true)?.textContent;
        return procedureType ?? PluProcedureType.UNBEKANNT;
    }


    _getPluProcedureStartDate() {
        let procedureStartDate = DcatappluMapper.select('./plu:procedureStartDate', this.record, true)?.textContent;
        let StartDate = MiscUtils.normalizeDateTime(procedureStartDate)
        return StartDate ?? ""
    }

    // ---------------------- ↑ already checked ↑ ---------------------- 
    // ----------------------------------------------------------------- 
    // ----------------------------------------------------------------- 
    // ----------------------------------------------------------------- 
    // ---------------------- ↓ not yet checked ↓ ---------------------- 

    // ------ Question: check ProcessStep, Distribution, Dataset
    _getPluDevelopmentFreezePeriod() {
        let periodOfTime: any;
        let periodObject = DcatappluMapper.select('./plu:developmentFreezePeriod/dct:PeriodOfTime', this.record, true);
        if (periodObject) {
            periodOfTime = {
                gte: MiscUtils.normalizeDateTime(DcatappluMapper.select('./dcat:startDate', periodObject, true)?.textContent),
                lte: MiscUtils.normalizeDateTime(DcatappluMapper.select('./dcat:endDate', periodObject, true)?.textContent)
            }
        }
        return periodOfTime;
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
            let distributionArray = this._getDistibutionArray(step)
            let distributions = this._mapDistributionArray(distributionArray)

            let nodes: string[] = DcatappluMapper.select('./dct:temporal/dct:PeriodOfTime', step, true);
            let period = this._getTemporalInternal(nodes);
            let processStep: ProcessStep = {
                identifier: DcatappluMapper.select('./dct:identifier', step, true)?.textContent ?? undefined,
                distributions,
                period: period?.[0],
                type: DcatappluMapper.select('./plu:ProcessStepType', step, true)?.textContent ?? PluProcessStepType.UNBEKANNT
            }
            processSteps.push(processStep);
        })
        return processSteps;
    }

    _getDistibutionArray(node){
        let distributionIDs = DcatappluMapper.select('./dcat:distribution', node)
            .map(node => node.getAttribute('rdf:resource'))
            .filter(processStep => processStep);
        const linked = this.linkedDistributions.filter(distribution => distributionIDs.includes(distribution.getAttribute('rdf:about')) )
        const local = DcatappluMapper.select('./dcat:distribution/dcat:Distribution', node)        
        return [...linked, ...local];
    }

    _mapDistributionArray(array: any[]){
        let dists = [];
        array?.map((dist: any) => {
            let nodes: string[] = DcatappluMapper.select('./dct:temporal/dct:PeriodOfTime', dist, true);
            let period = this._getTemporalInternal(nodes);
            let distribution: Distribution = {
                accessURL: DcatappluMapper.select('./dct:accessURL', dist, true)?.textContent ?? undefined,
                downloadURL: DcatappluMapper.select('./dct:downloadURL', dist, true)?.textContent,
                title: DcatappluMapper.select('./dct:title', dist, true)?.textContent,
                description: DcatappluMapper.select('./dct:description', dist, true)?.textContent,
                issued: DcatappluMapper.select('./dct:issued', dist, true)?.textContent,
                modified: DcatappluMapper.select('./dct:modified', dist, true)?.textContent,
                pluDocType: DcatappluMapper.select('./plu:docType', dist, true)?.textContent ?? PluDocType.UNBEKANNT,
                period: period?.[0],
                // ------ QUESTION: Following 2 attributes are of type "string[]". What is does "string[]" mean ?
                mapLayerNames: [DcatappluMapper.select('./plu:mapLayerNames', dist, true)?.textContent ?? undefined],
                format: [DcatappluMapper.select('./dct:format', dist, true)?.textContent ?? undefined],
                // ------ QUESTION: Following 2 attributes are defined in Distribution enum but not in Documentation (Chapter 4.4 -> Klasse: Distribution)
                id: DcatappluMapper.select('./dct:id', dist, true)?.textContent,
                byteSize: DcatappluMapper.select('./dcat:byteSize', dist, true)?.textContent, // number
            }
            dists.push(distribution);
        })
        return dists;
    }

    async _getDistributions(): Promise<Distribution[]> {
// ----- QUESTION: Do i have to get all linked Distributions again?
        return this._mapDistributionArray(this.linkedDistributions)

        // let dists = this.fetched.distributions;
        // if (dists) {
        //     return dists;
        // }
        // dists = [];
        // const linkedDists = this.linkedDatasetDistributions
        // this.linkedDatasetDistributions?.map((dist: any) => {
        //     // let format: string = "Unbekannt";
        //     // let formatNode = DcatappluMapper.select('./dct:format', this.linkedDistributions[i], true);
        //     // let mediaTypeNode = DcatappluMapper.select('./dcat:mediaType', this.linkedDistributions[i], true);
        //     // if (formatNode) {
        //     //     let formatLabel = DcatappluMapper.select('.//rdfs:label', formatNode, true);
        //     //     let formatValue = DcatappluMapper.select('.//rdf:value', formatNode, true);
        //     //     if(formatLabel){
        //     //         format = formatLabel.textContent;
        //     //     }
        //     //     else if(formatValue){
        //     //         format = formatValue.textContent;
        //     //     }
        //     //     else if (formatNode.textContent) {
        //     //         format = formatNode.textContent.trim();
        //     //     } else {
        //     //         format = formatNode.getAttribute('rdf:resource');
        //     //     }
        //     //     if(format.startsWith("http://publications.europa.eu/resource/authority/file-type/")){
        //     //         format = format.substring("http://publications.europa.eu/resource/authority/file-type/".length)
        //     //     }
        //     // } else if (mediaTypeNode) {
        //     //     if (mediaTypeNode.textContent) {
        //     //         format = mediaTypeNode.textContent;
        //     //     } else {
        //     //         format = mediaTypeNode.getAttribute('rdf:resource');
        //     //     }
        //     //     if(format.startsWith("https://www.iana.org/assignments/media-types/")){
        //     //         format = format.substring("https://www.iana.org/assignments/media-types/".length)
        //     //     }
        //     // }
        //     let nodes: string[] = DcatappluMapper.select('./dct:temporal/dct:PeriodOfTime', dist, true);
        //     let period = this._getTemporalInternal(nodes);
        //     // let period = this._getTemporalInternal(nodes)?.[0];
        //     // let period = undefined
        //     let distribution: Distribution = {
        //         accessURL: DcatappluMapper.select('./dct:accessURL', dist, true)?.textContent ?? undefined,
        //         downloadURL: DcatappluMapper.select('./dct:downloadURL', dist, true)?.textContent,
        //         title: DcatappluMapper.select('./dct:title', dist, true)?.textContent,
        //         description: DcatappluMapper.select('./dct:description', dist, true)?.textContent,
        //         issued: DcatappluMapper.select('./dct:issued', dist, true)?.textContent,
        //         modified: DcatappluMapper.select('./dct:modified', dist, true)?.textContent,
        //         pluDocType: DcatappluMapper.select('./plu:docType', dist, true)?.textContent ?? PluDocType.UNBEKANNT,
        //         period: period?.[0],
        //         // ------ QUESTION: Following 2 attributes are of type "string[]". What is does "string[]" mean ?
        //         mapLayerNames: [DcatappluMapper.select('./plu:mapLayerNames', dist, true)?.textContent ?? undefined],
        //         format: [DcatappluMapper.select('./dct:format', dist, true)?.textContent ?? undefined],
        //         // ------ QUESTION: Following 2 attributes are defined in Distribution enum but not in Documentation (Chapter 4.4 -> Klasse: Distribution)
        //         id: DcatappluMapper.select('./dct:id', dist, true)?.textContent,
        //         byteSize: DcatappluMapper.select('./dcat:byteSize', dist, true)?.textContent, // number
        //     }
        //     dists.push(distribution);
        // })
        // return dists;
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
            // let date = text; // new Date(Date.parse(text));
            let date = MiscUtils.normalizeDateTime(text);
            if (date) {
                return date;
            } else {
                this.log.warn(`Error parsing date, which was '${text}'. It will be ignored.`);
            }
        }
    }


    _getBoundingBox() {
        let bboxObject = DcatappluMapper.select('./dct:spatial/dct:Location/dcat:bbox[./@rdf:datatype="https://www.iana.org/assignments/media-types/application/vnd.geo+json"]', this.record, true);
        if (bboxObject) {
            return JSON.parse(bboxObject.textContent);
        }
        // ----- QUESTION: implment Fallback
        return undefined;
    }

    _getCentroid(): object {
        // return this._getSpatial();
        let centroid = DcatappluMapper.select('./dct:spatial/dct:Location/dcat:centroid[./@rdf:datatype="https://www.iana.org/assignments/media-types/application/vnd.geo+json"]', this.record, true);
        if (centroid) {
            return JSON.parse(centroid.textContent);
        }
        // ------ QuUESTION: What Kind of Fallback ?
        centroid = DcatappluMapper.select('./dct:spatial/ogc:Polygon/ogc:asWKT[./@rdf:datatype="http://www.opengis.net/rdf#WKTLiteral"]', this.record, true);
        if (centroid) {
            return this.wktToGeoJson(centroid.textContent);
        }
        return undefined;
    }



    async _getPublisher(): Promise<any[]> {
        if (this.fetched.publishers != null) {
            return this.fetched.publishers
        }
        let publishers = [];
        let dctPublishers = DcatappluMapper.select('./dct:publisher', this.record);
        dctPublishers?.map((publisher: any) => {
            let agent = DcatappluMapper.select('./foaf:Agent', publisher, true);
            if (!agent) {
                // ------ QuUESTION: What Kind of Fallback ?
                agent = DcatappluMapper.select('./foaf:Agent[@rdf:about="' + publisher.getAttribute('rdf:resource') + '"]', this.catalogPage, true)
            }
            if (agent) {
                let infos: any = {
                    name: DcatappluMapper.select('./foaf:name', agent, true)?.textContent ?? undefined,
                    type: DcatappluMapper.select('./dct:type', agent, true)?.textContent ?? undefined
                };

                publishers.push(infos);
            }
        })
        if (publishers.length === 0) {
            this.summary.missingPublishers++;
            return undefined;
        } else {
            this.fetched.publishers = publishers;
            return publishers;
        }
    }






    // ------------------------------------------------------------- 
    // ------------------------ ↓ BACKLOG ↓ ------------------------ 
    // ------------------------------------------------------------- 

    // → plan_or_procedure_start_date: mapper.getTemporal()?.[0]?.gte ?? mapper.getPluProcedureStartDate(),
    // → identifier: mapper.getGeneratedId(),


    _getGeneratedId(): string {
        return this.uuid;
    }


    public getSettings(): ImporterSettings {
        return this.settings;
    }

    public getSummary(): Summary {
        return this.summary;
    }












    async _getCatalog() {
        return {
            description: this.fetched.description,
            title: this.fetched.title,
            publisher: (await this._getPublisher())[0]
        }
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
    _getAccessRights(): string[] {
        return undefined;
    }

    _getCitation(): string {
        return undefined;
    }

    async _getDisplayContacts() {


        let displayName;
        let displayHomepage;

        if (this.settings.dcatappluProviderField) {
            switch (this.settings.dcatappluProviderField) {
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
                    let originator = this._getOriginator();
                    if (originator) {
                        displayName = originator[0].name;
                        displayHomepage = originator[0].homepage
                    }
                    break;
                case "publisher":
                    let publisher = await this._getPublisher();
                    if (publisher.length > 0) {
                        displayName = publisher[0].organization;
                        displayHomepage = null;
                    }
                    break;
            }
        }

        if (!displayName) {
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

        if (!displayName) {
            let publisher = await this.getPublisher();
            if (publisher && publisher[0]['organization']) {
                displayName = publisher[0]['organization'];
            }
        }

        if (!displayName) {
            let creator = this.getCreator();
            if (creator) {
                displayName = creator[0].name;
                displayHomepage = creator[0].homepage
            }
        }

        if (!displayName) {
            let maintainer = this.getMaintainer();
            if (maintainer) {
                displayName = maintainer[0].name;
                displayHomepage = maintainer[0].homepage
            }
        }

        if (!displayName) {
            let originator = this._getOriginator();
            if (originator) {
                displayName = originator[0].name;
                displayHomepage = originator[0].homepage
            }
        }

        if (!displayName) {
            displayName = this.settings.description.trim()
        }

        if (this.settings.providerPrefix) {
            displayName = this.settings.providerPrefix + displayName;
        }

        let displayContact: Person = {
            name: displayName.trim(),
            homepage: displayHomepage
        };

        return [displayContact];
    }



    /**
     * Extracts and returns an array of keywords defined in the ISO-XML document.
     * This method also checks if these keywords contain at least one of the
     * given mandatory keywords. If this is not the case, then the mapped
     * document is flagged to be skipped from the index. By default this array
     * contains just one entry 'opendata' i.e. if the ISO-XML document doesn't
     * have this keyword defined, then it will be skipped from the index.
     */
    _getKeywords(): string[] {
        let keywords = [];
        let keywordNodes = DcatappluMapper.select('./dcat:keyword', this.record);
        if (keywordNodes) {
            for (let i = 0; i < keywordNodes.length; i++) {
                keywords.push(keywordNodes[i].textContent)
            }
        }

        if (this.settings.filterTags && this.settings.filterTags.length > 0 && !keywords.some(keyword => this.settings.filterTags.includes(keyword))) {
            this.skipped = true;
        }

        return keywords;
    }

    _getMetadataIssued(): Date {
        return (this.storedData && this.storedData.issued) ? new Date(this.storedData.issued) : new Date(Date.now());
    }

    _getMetadataModified(): Date {
        if (this.storedData && this.storedData.modified && this.storedData.dataset_modified) {
            let storedDataset_modified: Date = new Date(this.storedData.dataset_modified);
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

    _getModifiedDate() {
        let modified = DcatappluMapper.select('./dct:modified', this.record, true);
        return modified ? new Date(modified.textContent) : undefined;
    }

    _getSpatial(): any {
        let geometry = DcatappluMapper.select('./dct:spatial/dct:Location/locn:geometry[./@rdf:datatype="https://www.iana.org/assignments/media-types/application/vnd.geo+json"]', this.record, true);
        if (geometry) {
            return JSON.parse(geometry.textContent);
        }
        geometry = DcatappluMapper.select('./dct:spatial/ogc:Polygon/ogc:asWKT[./@rdf:datatype="http://www.opengis.net/rdf#WKTLiteral"]', this.record, true);
        if (geometry) {
            return this.wktToGeoJson(geometry.textContent);
        }
        return undefined;
    }

    wktToGeoJson(wkt: string): any {
        try {
            var coordsPos = wkt.indexOf("(");
            var type = wkt.substring(0, coordsPos).trim();
            if (type.lastIndexOf(' ') > -1) {
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
        } catch (e) {
            this.summary.appErrors.push("Can't parse WKT: " + e.message);
        }
    }

    _getSpatialText(): string {
        let prefLabel = DcatappluMapper.select('./dct:spatial/dct:Location/skos:prefLabel', this.record, true);
        if (prefLabel) {
            return prefLabel.textContent;
        }
        return undefined;
    }



    _getThemes() {
        // Return cached value, if present
        if (this.fetched.themes) return this.fetched.themes;

        // Evaluate the themes
        let themes: string[] = DcatappluMapper.select('./dcat:theme', this.record)
            .map(node => node.getAttribute('rdf:resource'))
            .filter(theme => theme); // Filter out falsy values

        if (this.settings.filterThemes && this.settings.filterThemes.length > 0 && !themes.some(theme => this.settings.filterThemes.includes(theme.substr(theme.lastIndexOf('/') + 1)))) {
            this.skipped = true;
        }

        this.fetched.themes = themes;
        return themes;
    }

    _isRealtime(): boolean {
        return undefined;
    }

    _getAccrualPeriodicity(): string {
        // let accrualPeriodicity = DcatappluMapper.select('./dct:accrualPeriodicity', this.record, true);
        // if (accrualPeriodicity) {
        //     let res = accrualPeriodicity.getAttribute('rdf:resource');
        //     let periodicity;
        //     if(res.length > 0)
        //         periodicity =  res.substr(res.lastIndexOf('/') + 1);
        //     else if(accrualPeriodicity.textContent.trim().length > 0)
        //         periodicity =  accrualPeriodicity.textContent;


        //     if(periodicity){
        //         let period = DcatPeriodicityUtils.getPeriodicity(periodicity)
        //         if(!period){
        //             this.summary.warnings.push(["Unbekannte Periodizität", periodicity]);
        //         }
        //         return period;
        //     }
        // }
        return undefined;
    }

    async _getLicense() {
        let license: License;

        //     let accessRights = DcatappluMapper.select('./dct:accessRights', this.record);
        //     if(accessRights){
        //         for(let i=0; i < accessRights.length; i++){
        //             try {
        //                 let json = JSON.parse(accessRights[i]);

        //                 if (!json.id || !json.url) continue;

        //                 let requestConfig = this.getUrlCheckRequestConfig(json.url);
        //                 license = {
        //                     id: json.id,
        //                     title: json.name,
        //                     url: await UrlUtils.urlWithProtocolFor(requestConfig, this.settings.skipUrlCheckOnHarvest)
        //                 };

        //             } catch(ignored) {}

        //         }
        //     }
        //     if(!license){
        //         for(let i = 0; i < this.linkedDistributions.length; i++) {
        //             let licenseResource = DcatappluMapper.select('dct:license', this.linkedDistributions[i], true);
        //             if(licenseResource) {
        //                 license = await DcatLicensesUtils.get(licenseResource.getAttribute('rdf:resource'));
        //                 break;
        //             }
        //         }
        //     }

        //     if (!license) {
        //         let msg = `No license detected for dataset. ${this.getErrorSuffix(this.uuid, this.getTitle())}`;
        //         this.summary.missingLicense++;

        //         this.log.warn(msg);
        //         this.summary.warnings.push(['Missing license', msg]);
        //         return {
        //             id: 'unknown',
        //             title: 'Unbekannt',
        //             url: undefined
        //         };
        //     }

        return license;
    }

    getErrorSuffix(uuid, title) {
        return `Id: '${uuid}', title: '${title}', source: '${this.settings.catalogUrl}'.`;
    }

    _getHarvestedData(): string {
        return this.record.toString();
    }

    _getCreator(): Person[] {
        let creators = [];

        let creatorNodes = DcatappluMapper.select('./dct:creator', this.record);
        for (let i = 0; i < creatorNodes.length; i++) {
            let organization = DcatappluMapper.select('./foaf:Organization', creatorNodes[i], true);
            if (organization) {
                let name = DcatappluMapper.select('./foaf:name', organization, true);
                let mbox = DcatappluMapper.select('./foaf:mbox', organization, true);
                if (name) {
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

        let maintainerNodes = DcatappluMapper.select('./dct:maintainer', this.record);
        for (let i = 0; i < maintainerNodes.length; i++) {
            let organization = DcatappluMapper.select('./foaf:Organization', maintainerNodes[i], true);
            if (organization) {
                let name = DcatappluMapper.select('./foaf:name', organization, true);
                let mbox = DcatappluMapper.select('./foaf:mbox', organization, true);
                if (name) {
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

    _getGroups(): string[] {
        return undefined;
    }

    _getIssued(): Date {
        let modified = DcatappluMapper.select('./dct:modified', this.record, true);
        return modified ? new Date(modified.textContent) : undefined;
    }

    _getMetadataHarvested(): Date {
        return new Date(Date.now());
    }

    _getSubSections(): any[] {
        return undefined;
    }

    _getOriginator(): Person[] {

        let originators = [];

        let originatorNode = DcatappluMapper.select('./dcatde:originator', this.record);
        for (let i = 0; i < originatorNode.length; i++) {
            let organization = DcatappluMapper.select('./foaf:Organization', originatorNode[i], true);
            if (organization) {
                let name = DcatappluMapper.select('./foaf:name', organization, true);
                let mbox = DcatappluMapper.select('./foaf:mbox', organization, true);
                let infos: any = {
                    name: name.textContent
                };
                if (mbox) infos.mbox = mbox.textContent;

                originators.push(infos);
            }
        }

        return originators.length === 0 ? undefined : originators;
    }



    _getUrlCheckRequestConfig(uri: string): RequestOptions {
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
                eval(this.settings.customCode); doc
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
