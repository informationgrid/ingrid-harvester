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
import * as MiscUtils from '../../utils/misc.utils';
import { getLogger } from 'log4js';
import { namespaces } from '../../importer/namespaces';
import { throwError } from 'rxjs';
import { Agent, Contact } from '../../model/agent';
import { BaseMapper } from '../base.mapper';
import { DateRange } from '../../model/dateRange';
import { DcatappluSettings } from './dcatapplu.settings';
import { Distribution } from '../../model/distribution';
import { Geometry, Point } from '@turf/helpers';
import { ImporterSettings } from '../../importer.settings';
import { MetadataSource } from '../../model/index.document';
import { PluDocType, PluPlanState, PluPlanType, PluProcedureState, PluProcedureType, ProcessStep, PluProcessStepType, Catalog } from '../../model/dcatApPlu.model';
import { Summary } from '../../model/summary';
import { XPathElementSelect } from '../../utils/xpath.utils';

export class DcatappluMapper extends BaseMapper {

    static select = <XPathElementSelect>xpath.useNamespaces({
        'adms': namespaces.ADMS,
        'dcat': namespaces.DCAT,
        'dcatde': namespaces.DCATDE,
        'dct': namespaces.DCT,
        'foaf': namespaces.FOAF,
        'hydra': namespaces.HYDRA,
        'locn': namespaces.LOCN,
        'ogc': namespaces.OGC,
        'plu': namespaces.PLU,
        'rdf': namespaces.RDF,
        'rdfs': namespaces.RDFS,
        'schema': namespaces.SCHEMA,
        'skos': namespaces.SKOS,
        'vcard': namespaces.VCARD
    });

    log = getLogger();

    private readonly record: any;
    private readonly catalogPage: any;
    private readonly linkedDistributions: any[];
    private readonly linkedProcessSteps: any[];
    private harvestTime: any;

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

    constructor(settings, record, catalog, catalogPage, harvestTime, summary) {
        super();
        this.settings = settings;
        this.record = record;
        this.fetched.catalog = catalog;
        this.harvestTime = harvestTime;
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

    async getContactPoint(): Promise<Contact> {
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

    getDescription(): string {
        let description = DcatappluMapper.select('./dct:description', this.record, true)?.textContent;
        return description ?? "";
    }

    getGeneratedId(): string {
        return this.uuid;
    }

    getAdmsIdentifier(): string {
        let admsIdentifier = DcatappluMapper.select('./adms:identifier/adms:Identifier/skos:notation', this.record, true)?.textContent;
        return getUrlHashCode(admsIdentifier);
    }

    getTitle(): string {
        let title = DcatappluMapper.select('./dct:title', this.record, true)?.textContent;
        return title ?? "";
    }

    getPluPlanName(): string {
        let planName = DcatappluMapper.select('./plu:planName', this.record, true)?.textContent;
        return planName ?? "";
    }

    getPluPlanState(): PluPlanState {
        let planState = DcatappluMapper.select('./plu:planState/@rdf:resource', this.record, true)?.textContent;
        return getUrlHashCode(planState) ?? PluPlanState.UNBEKANNT;
    }

    getPluPlanType(): PluPlanType {
        let planType = DcatappluMapper.select('./plu:planType/@rdf:resource', this.record, true)?.textContent;
        return getUrlHashCode(planType) ?? PluPlanType.UNBEKANNT;
    }

    getPluPlanTypeFine(): string {
        let planTypeFine = DcatappluMapper.select('./plu:planTypeFine/@rdf:resource', this.record, true)?.textContent;
        return planTypeFine;
    }

    getPluProcedureState(): PluProcedureState {
        let procedureState = DcatappluMapper.select('./plu:procedureState/@rdf:resource', this.record, true)?.textContent;
        return getUrlHashCode(procedureState) ?? PluProcedureState.UNBEKANNT;
    }

    getPluProcedureType(): PluProcedureType {
        let procedureType = DcatappluMapper.select('./plu:procedureType/@rdf:resource', this.record, true)?.textContent;
        return getUrlHashCode(procedureType) ?? PluProcedureType.UNBEKANNT;
    }

    getRelation(): string {
        let relation = DcatappluMapper.select('./dct:relation/@rdf:resource', this.record, true)?.textContent;
        return relation;
    }

    getPluProcedurePeriod(): DateRange {
        let periodObject = DcatappluMapper.select('./plu:procedurePeriod/dct:PeriodOfTime', this.record, true);
        if (periodObject) {
            return this.getTemporalInternal(periodObject)?.[0];
        }
        else {
            let procedureStartDate = DcatappluMapper.select('./plu:procedureStartDate', this.record, true)?.textContent;
            let startDate = MiscUtils.normalizeDateTime(procedureStartDate);
            return { gte: startDate };
        }
    }

    getPluDevelopmentFreezePeriod(): DateRange {
        let periodOfTime: DateRange;
        let periodObject = DcatappluMapper.select('./plu:developmentFreezePeriod/dct:PeriodOfTime', this.record, true);
        if (periodObject) periodOfTime = this.getTemporalInternal(periodObject)?.[0];
        return periodOfTime;
    }

    getPluNotification(): string {
        let notification = DcatappluMapper.select('./plu:notification', this.record, true)?.textContent;
        return notification;
    }

    getPluProcessSteps(): ProcessStep[] {
        let processSteps: any[] = [];
        let processStepIDs = DcatappluMapper.select('./plu:processStep', this.record)
            .map(node => node.getAttribute('rdf:resource'))
            .filter(processStep => processStep);
        const linked = this.linkedProcessSteps.filter(processStep => processStepIDs.includes(processStep.getAttribute('rdf:about')));
        const local = DcatappluMapper.select('./plu:processStep/plu:ProcessStep', this.record);
        let pluProcessSteps: any[] = [...linked, ...local];
        pluProcessSteps.map((step: any) => {
            let node = DcatappluMapper.select('./dct:temporal/dct:PeriodOfTime', step, true);
            let type = getUrlHashCode(DcatappluMapper.select('./plu:ProcessStepType/@rdf:resource', step, true)?.textContent);
            let period = this.getTemporalInternal(node);
            let processStep: ProcessStep = {
                identifier: DcatappluMapper.select('./dct:identifier', step, true)?.textContent,
                title: DcatappluMapper.select('./dct:title', step, true)?.textContent,
                type: type ?? PluProcessStepType.UNBEKANNT,
                distributions: this.getRelevantDistibutions(step),
                temporal: period?.[0],
                passNumber: parseInt(DcatappluMapper.select('./plu:passNumber', step, true)?.textContent)
            }
            processSteps.push(processStep);
        });
        return processSteps;
    }

    private getRelevantDistibutions(node) {
        let distributions = [];
        let distributionIDs = DcatappluMapper.select('./dcat:distribution', node)
            .map(node => node.getAttribute('rdf:resource'))
            .filter(distribution => distribution);
        const linked = this.linkedDistributions.filter(distribution => distributionIDs.includes(distribution.getAttribute('rdf:about')));
        const local = DcatappluMapper.select('./dcat:distribution/dcat:Distribution', node);
        const relevantDistributions = [...linked, ...local];
        relevantDistributions?.map((dist: any) => {
            let node = DcatappluMapper.select('./dct:temporal/dct:PeriodOfTime', dist, true);
            let period = this.getTemporalInternal(node);
            let format = DcatappluMapper.select('./dct:format', dist, true)?.textContent;
            // TODO temporary backward compatibility for DCAT-AP.PLU 0.1.0
            if (!format) {
                format = DcatappluMapper.select('./dct:format/@rdf:resource', dist, true)?.textContent;
            }
            let distribution: Distribution = {
                accessURL: DcatappluMapper.select('./dcat:accessURL/@rdf:resource', dist, true)?.textContent ?? "",
                downloadURL: DcatappluMapper.select('./dcat:downloadURL/@rdf:resource', dist, true)?.textContent,
                title: DcatappluMapper.select('./dct:title', dist, true)?.textContent,
                description: DcatappluMapper.select('./dct:description', dist, true)?.textContent,
                issued: MiscUtils.normalizeDateTime(DcatappluMapper.select('./dct:issued', dist, true)?.textContent),
                modified: MiscUtils.normalizeDateTime(DcatappluMapper.select('./dct:modified', dist, true)?.textContent),
                pluDocType: getUrlHashCode(DcatappluMapper.select('./plu:docType/@rdf:resource', dist, true)?.textContent) ?? PluDocType.UNBEKANNT,
                temporal: period?.[0],
                mapLayerNames: DcatappluMapper.select('./plu:mapLayerNames', dist, true)?.textContent?.split(",").map((layerName: string) => layerName.trim()),
                format: [format],
            }
            distributions.push(distribution);
        });
        return distributions;
    }

    async getDistributions(): Promise<Distribution[]> {
        let distributions = this.getRelevantDistibutions(this.record);
        return distributions;
    }

    private getTemporalInternal(node: Node): DateRange[] {
        let result: DateRange[] = [];
        if (node) {
            let begin = this.getTimeValue(node, 'startDate');
            let end = this.getTimeValue(node, 'endDate');
            if (begin || end) {
                result.push({
                    gte: begin,
                    lte: end
                });
            }
        }
        return result.length ? result : undefined;
    }

    getTemporal(): DateRange[] {
        let node = DcatappluMapper.select('./dct:temporal/dct:PeriodOfTime', this.record, true);
        return this.getTemporalInternal(node);
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

    getAgent(nodes): Agent[] {
        let agents: Agent[] = [];
        nodes?.map((publisher: any) => {
            let agent = DcatappluMapper.select('./foaf:Agent', publisher, true);
            if (agent) {
                let infos: any = {
                    name: DcatappluMapper.select('./foaf:name', agent, true)?.textContent,
                    type: DcatappluMapper.select('./dct:type/@rdf:resource', agent, true)?.textContent
                };
                agents.push(infos);
            }
        });
        return agents.length ? agents : undefined;
    }

    async getPublisher(): Promise<any[]> {
        if (this.fetched.publishers != null) {
            return this.fetched.publishers;
        }
        let node = DcatappluMapper.select('./dct:publisher', this.record);
        let publishers: any[] = this.getAgent(node);
        if (publishers.length === 0) {
            this.summary.missingPublishers++;
            return undefined;
        } else {
            this.fetched.publishers = publishers;
            return publishers;
        }
    }

    async getMaintainers(): Promise<any[]> {
        let nodes = DcatappluMapper.select('./dcatde:maintainer', this.record);
        let maintainers: any[] = this.getAgent(nodes);
        return maintainers;
    }
    async getContributors(): Promise<any[]> {
        let nodes = DcatappluMapper.select('./dct:contributor', this.record);
        let contributors: any[] = this.getAgent(nodes);
        return contributors;
    }

    getHarvestedData(): string {
        return this.record.toString();
    }

    getHarvestingDate(): Date {
        return new Date(Date.now());
    }

    getIssued(): Date {
        let issued = DcatappluMapper.select('./dct:issued', this.record, true);
        return issued ? MiscUtils.normalizeDateTime(issued.textContent) : undefined;
    }

    getModifiedDate(): Date {
        let modified = DcatappluMapper.select('./dct:modified', this.record, true);
        return modified ? MiscUtils.normalizeDateTime(modified.textContent) : undefined;
    }

    getMetadataSource(): MetadataSource {
        let dcatLink; //=  DcatappluMapper.select('.//dct:creator', this.record);
        let portalLink = this.record.getAttribute('rdf:about');
        return {
            source_base: this.settings.sourceURL,
            raw_data_source: dcatLink,
            source_type: 'dcatapplu',
            portal_link: portalLink,
            attribution: this.settings.defaultAttribution
        };
    }

    getCatalog(): Catalog {
        return this.fetched.catalog;
    }

    getSpatialText(): string {
        let geographicName = DcatappluMapper.select('./dct:spatial/dct:Location/locn:geographicName', this.record, true)?.textContent;
        return geographicName;
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

    getBoundingBox(): Geometry {
        let bboxObject = DcatappluMapper.select('./dct:spatial/dct:Location/dcat:bbox[./@rdf:datatype="https://www.iana.org/assignments/media-types/application/vnd.geo+json"]', this.record, true);
        if (bboxObject) {
            return JSON.parse(bboxObject.textContent);
        }
        return undefined;
    }

    getCentroid(): Point {
        let centroid = DcatappluMapper.select('./dct:spatial/dct:Location/dcat:centroid[./@rdf:datatype="https://www.iana.org/assignments/media-types/application/vnd.geo+json"]', this.record, true);
        if (centroid) {
            return JSON.parse(centroid.textContent);
        }
        return undefined;
    }

    getSpatial(): Geometry {
        let geometry = DcatappluMapper.select('./dct:spatial/dct:Location/locn:geometry[./@rdf:datatype="https://www.iana.org/assignments/media-types/application/vnd.geo+json"]', this.record, true);
        if (geometry) {
            return JSON.parse(geometry.textContent);
        }
        return undefined;
    }
}

function getUrlHashCode(string:any){
    return string?.split("#")?.pop();
}