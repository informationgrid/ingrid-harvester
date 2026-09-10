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

import type { ElasticsearchCatalogSettings } from '@shared/catalog.js';
import * as crypto from "crypto";
import log4js from 'log4js';
import type { CkanMapper } from "../../../importer/ckan/ckan.mapper.js";
import type { CswMapper } from "../../../importer/csw/csw.mapper.js";
import type { DcatapdeMapper } from '../../../importer/dcatapde/dcatapde.mapper.js';
import type { GenesisMapper } from "../../../importer/genesis/genesis.mapper.js";
import type { ToElasticMapper } from '../../../importer/to.elastic.mapper.js';
import type { WfsMapper } from '../../../importer/wfs/wfs.mapper.js';
import type { Distribution } from "../../../model/distribution.js";
import type { DocumentFactory } from "../../../model/index.document.factory.js";
import type {
    IndexContact,
    IndexKeyword,
    IndexReference,
    IndexSpatial,
    IndexTemporal
} from '../../../model/index.document.js';
import { CatalogService } from '../../../services/catalog/CatalogService.js';
import { ProfileFactoryLoader } from '../../profile.factory.loader.js';
import type {
    IngridConformanceResult,
    IngridDataQuality,
    IngridDocumentType,
    IngridIndexDocument,
    IngridLicense,
    IngridSpatialRepresentation,
    IngridSpecific
} from "../model/index.document.js";
import type { IngridOpendataDistribution, IngridOpendataIndexDocument } from "../model/opendataindex.document.js";
import type { IngridDeprecatedIndexDocument } from "../model/index.document.deprecated.js";
import type { IngridOpendataDeprecatedIndexDocument } from "../model/opendataindex.document.deprecated.js";
import { Codelist } from "../utils/codelist.js";

export type ingridMapperType = CswMapper | CkanMapper | DcatapdeMapper | WfsMapper | GenesisMapper;

// which document shape a mapper produces. Extend this array (and getDocumentBuilders() below) when
// a new shape is added - createIndexDocument() itself doesn't need to change. Kept as a runtime array
// (not just a type) because resolveMappingHint() needs to check schemaName membership at runtime.
export const DOCUMENT_KINDS = ['ingrid', 'opendata', 'ingrid-deprecated', 'opendata-deprecated'] as const;
export type DocumentKind = typeof DOCUMENT_KINDS[number];

type IngridMapperIndexDocument = IngridIndexDocument | IngridOpendataIndexDocument | IngridDeprecatedIndexDocument | IngridOpendataDeprecatedIndexDocument;

// the fields shared by the current (non-deprecated) document kinds, assembled by buildCommonFields()
// and merged into each such kind's specific fields by that kind's builder (see getDocumentBuilders()).
// The deprecated kind shares nothing structurally with this and builds itself from scratch instead.
type CommonIndexFields = Awaited<ReturnType<ingridMapper<any>['buildCommonFields']>>;

export abstract class ingridMapper<M extends ingridMapperType>
    implements DocumentFactory<IngridMapperIndexDocument>, ToElasticMapper<IngridMapperIndexDocument> {

    readonly baseMapper: M;

    private _log = log4js.getLogger();

    constructor(baseMapper: M) {
        this.baseMapper = baseMapper;
    }

    // TODO make abstract
    createCswIsoDocument(): string {
        return null;
    }

    // TODO make abstract
    createDcatapdeDocument(): string {
        return null;
    }

    // 'ingrid' produces an IngridIndexDocument, 'opendata' an IngridOpendataIndexDocument.
    // Resolved from the target catalogs' configured Elastic mapping (see resolveMappingHint());
    // falls back to `getDefaultDocumentKind()` when that can't be resolved (e.g. dry runs, no
    // catalogs assigned, or catalogs with mixed mappings).
    getDocumentKind(): DocumentKind {
        return this.resolveMappingHint() ?? this.getDefaultDocumentKind();
    }

    // looks up which of getAvailableIndexMappings()'s schemaNames applies to this mapper's target
    // catalogs (this.baseMapper.settings.catalogIds), so a mapper capable of producing more than
    // one document shape (most notably CSW) knows which one to build. Returns undefined if none
    // of the catalogs are Elasticsearch catalogs, or if they resolve to more than one distinct
    // mapping (mixed InGrid/OpenData catalogs for the same import job).
    private resolveMappingHint(): DocumentKind | undefined {
        const schemaNames = new Set<string>();
        for (const catalogId of this.baseMapper.settings.catalogIds ?? []) {
            const catalogSettings = CatalogService.getCatalogSettings(catalogId) as Partial<ElasticsearchCatalogSettings>;
            const mappingFile = catalogSettings?.settings?.mappingFile;
            if (!mappingFile) continue;
            const schemaName = ProfileFactoryLoader.get().getAvailableIndexMappings().find(o => o.value === mappingFile)?.schemaName;
            if (schemaName && (DOCUMENT_KINDS as readonly string[]).includes(schemaName)) {
                schemaNames.add(schemaName);
            }
        }
        if (schemaNames.size === 1) {
            return [...schemaNames][0] as DocumentKind;
        }
        if (schemaNames.size > 1) {
            this._log.warn(`Catalogs [${this.baseMapper.settings.catalogIds}] use mixed Elastic mappings (${[...schemaNames].join(', ')}); falling back to this mapper's default document kind.`);
        }
        return undefined;
    }

    // the document kind a mapper subclass produces when no catalog-derived hint is available —
    // 'ingrid' for CSW/WFS-sourced data, 'opendata' for CKAN/DCAT-AP.de/Genesis-sourced data,
    // since only the source format determines which fields can meaningfully be populated by
    // default (e.g. a CSW source has no real DCAT `distributions`, a CKAN source has no real ISO
    // `exports.iso`).
    protected getDefaultDocumentKind(): DocumentKind {
        return 'ingrid';
    }

    // the fields shared by every document kind. Kept separate from the kind-specific builders in
    // getDocumentBuilders() so createIndexDocument() only has to assemble this once regardless of
    // which kind ends up being built.
    private async buildCommonFields() {
        return {
            ...this.getCustomEntries(),
            id: this.getGeneratedId(),
            $schema: undefined, // set by the target catalog from the selected JSON schema's $id
            metadata: {
                data_type: 'INGRID' as const,
                document_type: this.getDocumentType(),
                created: null,  // TODO: populate from source record
                modified: this.getModifiedDate()?.toISOString() ?? null,
                partner: this.baseMapper.settings.partner?.split(',').map(p => p.trim())[0],
                provider: this.baseMapper.settings.provider?.split(',').map(p => p.trim())[0],
                language: this.getMetadataLanguage(),
                datasource: {
                    id: this.baseMapper.settings.dataSourceName,
                    name: this.baseMapper.settings.dataSourceName,
                    type: this.baseMapper.getMetadataSourceType(),
                }
            },
            title: this.getTitle(),
            sort_uuid: this.getSortUuid(),
            description: this.getDescription(),
            language: this.getLanguage(),
            contacts: await this.getContacts(),
            spatials: this.getSpatials(),
            temporal: this.getTemporal(),
            keywords: this.getKeywords(),
            references: this.getReferences(),
        };
    }

    private async buildIngridDocument(): Promise<IngridIndexDocument> {
        const common = await this.buildCommonFields();
        return {
            ...common,
            exports: { iso: this.getIso() },
            ingrid: this.getIngrid(),
            crs: this.getCrs(),
        };
    }

    private async buildOpendataDocument(): Promise<IngridOpendataIndexDocument> {
        const common = await this.buildCommonFields();
        return {
            ...common,
            exports: { rdf: await this.getRdf() },
            dcat: this.getDcat(),
            legal_basis: this.getLegalBasis(),
            distributions: await this.getDistributions(),
            political_geocoding_level_uri: this.getPoliticalGeocodingLevelUri(),
        };
    }

    // registry of document-kind builders, keyed by DocumentKind. This is the single place new
    // kinds get wired up - adding one means adding a union member to DOCUMENT_KINDS, a buildXyz()
    // method, and an entry here (possibly in a subclass, see ingridCswMapper's override for
    // 'ingrid-deprecated'); createIndexDocument() itself never needs to change. Partial, since not
    // every mapper subclass builds every kind - createIndexDocument() throws on a missing entry.
    protected getDocumentBuilders(): Partial<Record<DocumentKind, () => Promise<IngridMapperIndexDocument>>> {
        return {
            ingrid: () => this.buildIngridDocument(),
            opendata: () => this.buildOpendataDocument(),
        };
    }

    async createIndexDocument(): Promise<IngridMapperIndexDocument> {
        const kind = this.getDocumentKind();
        const build = this.getDocumentBuilders()[kind];
        if (!build) {
            throw new Error(`No document builder registered for kind "${kind}"`);
        }
        const result = await build();
        this.executeCustomCode(result);
        return result;
    }

    getIngrid(): IngridSpecific {
        return {
            alternate_title: this.getAlternateTitle(),
            licenses: this.getLicenses(),
            parent_identifier: this.getParentIdentifier(),
            datasource_identifier: this.getDatasourceIdentifier(),
            spatial_representation: this.getSpatialRepresentation(),
            specific_usage: this.getSpecificUsage(),
            purpose: this.getPurpose(),
            conformance_result: this.getConformanceResult(),
            order_info: this.getOrderInfo(),
            data_quality: this.getDataQuality(),
            character_set: this.getCharacterSet(),
            spatialResolutionScale: this.getSpatialResolutionScale(),
            cross_references: this.getCrossReferences(),
            lineage: this.getLineage(),
            processStepDescription: this.getProcessStepDescription(),
            symbolCatalogue: this.getSymbolCatalogue(),
            codeListReference: this.getCodeListReference(),
            attributeDescription: this.getAttributeDescription(),
            spatial: this.getIngridSpatial(),
            service: this.getService(),
        };
    }

    getCrs(): string[] {
        return undefined;
    }

    getSpatialResolutionScale(): IngridSpecific['spatialResolutionScale'] {
        return undefined;
    }

    // Deliberately always undefined here: a cross_references entry needs the uuid/name/
    // document_type of the *other*, coupled record (service<->dataset), which a single mapper
    // invocation has no access to - only the coupled record's own source XML declares it (and
    // only in one direction, via srv:operatesOn/srv:coupledResource on the service side, as bare
    // UUIDs with no name/document_type). The actual, bidirectional population happens once both
    // sides are already-mapped documents, in IngridElasticsearchCatalog.resolveCoupling()
    // (server/app/profiles/ingrid/catalog/elasticsearch.catalog.ts).
    getCrossReferences(): IngridSpecific['cross_references'] {
        return undefined;
    }

    getLineage(): IngridSpecific['lineage'] {
        return undefined;
    }

    getProcessStepDescription(): string[] {
        return undefined;
    }

    getSymbolCatalogue(): IngridSpecific['symbolCatalogue'] {
        return undefined;
    }

    getCodeListReference(): IngridSpecific['codeListReference'] {
        return undefined;
    }

    // TODO: no confirmed ISO source element found for this field yet
    getAttributeDescription(): string[] {
        return undefined;
    }

    getIngridSpatial(): IngridSpecific['spatial'] {
        return undefined;
    }

    getService(): IngridSpecific['service'] {
        return undefined;
    }

    getDocumentType(): IngridDocumentType {
        return undefined;
    }

    getCharacterSet(): { key: string | null, value: string | null } {
        return undefined;
    }

    getSpatialRepresentation(): IngridSpatialRepresentation[] {
        return undefined;
    }

    getSpecificUsage(): string {
        return undefined
    }

    getOrderInfo(): string {
        return undefined
    }

    getPurpose(): string {
        return undefined
    }

    getDatasourceIdentifier(): string {
        return undefined
    }

    getParentIdentifier(): string {
        return undefined;
    }

    getReferences(): IndexReference[] {
        return undefined;
    }

    getLicenses(): IngridLicense[] {
        return undefined
    }

    getConformanceResult(): IngridConformanceResult[] {
        return undefined;
    }

    getDataQuality(): IngridDataQuality {
        return undefined;
    }

    getCustomEntries(): object {
        return {};
    }

    getTitle(): string {
        return this.baseMapper.getTitle();
    }

    getModifiedDate(): Date {
        return this.baseMapper.getModifiedDate();
    }

    // if the custom entries contain a "uuid", use it
    // otherwise, use the "generated" id, e.g. gmlId (WFS) or fileIdentifier (CSW)
    getGeneratedId(): string {
        return this.baseMapper.getGeneratedId();
    }

    getHarvestedData(): string {
        return this.baseMapper.getHarvestedData();
    }

    getHarvestingErrors() {
        return this.baseMapper.getHarvestingErrors();
    }

    shouldBeSkipped() {
        return this.baseMapper.shouldBeSkipped();
    }

    executeCustomCode(doc: any) {
        this.baseMapper.executeCustomCode(doc);
    }

    getTemporalGteStartDate() {
        return this.getT0();
    }

    getT0() {
        return undefined;
    }

    getDescription(): string {
        return undefined;
    }

    getAlternateTitle() {
        return undefined;
    }

    // the deprecated shape's `alternatetitle` field is an array (unlike the new shape's joined-string
    // `alternate_title`) - kept as its own stub/override rather than reusing getAlternateTitle(), since
    // that one is shared with the new shape and must stay a joined string for it.
    getAlternateTitleDeprecated(): string[] {
        return undefined;
    }

    async getDistributionsDeprecated(): Promise<Distribution[]> {
        return undefined;
    }

    getOrganisation() {
        let organisation = this.transformToIgcDomainId(this.baseMapper.settings.provider, "111");
        return organisation;
    }

    getSortUuid(): string {
        return crypto.createHash('sha1').update(this.getTitle(), 'binary').digest('hex');
    }

    // root-level language of the described dataset (as opposed to metadata.language, the language of the metadata record itself)
    getLanguage(): string {
        return undefined;
    }

    getMetadataLanguage(): string {
        return undefined;
    }

    async getContacts(): Promise<IndexContact[]> {
        return undefined;
    }

    getSpatials(): IndexSpatial[] {
        return undefined;
    }

    getTemporal(): IndexTemporal {
        return undefined;
    }

    getKeywords(): IndexKeyword[] {
        return undefined;
    }

    getIso(): string {
        return undefined;
    }

    async getRdf(): Promise<string> {
        return undefined;
    }

    getDcat(): { landing_page?: string } {
        return undefined;
    }

    getLegalBasis(): string {
        return undefined;
    }

    async getDistributions(): Promise<IngridOpendataDistribution[]> {
        return undefined;
    }

    getPoliticalGeocodingLevelUri(): string {
        return undefined;
    }

    getIDF(): string {
        return undefined;
    };

    getCapabilitiesURL(): string[] {
        return undefined;
    }

    // 'ingrid-deprecated' (the pre-migration IGC/t0xx-column-style shape) field getters, stubbed here
    // so buildIngridDeprecatedDocument() below can call them polymorphically - mirrors exactly how the
    // pre-migration base class (commit e442e84b) stubbed this same set. Overridden today by
    // ingridCswMapper (the full set, via ISO 19139 XPath) and ingridWfsMapper (getSpatial/getIDF/
    // getX1-getY2/getAdditionalHtml only - the rest stay undefined for WFS, same as before the migration).
    getT1() {
        return undefined;
    }

    getT2() {
        return undefined;
    }

    getT01_object() {
        return {
            obj_id: this.getGeneratedId(),
            org_obj_id: this.getGeneratedId()
        };
    }

    getAddress() {
        return undefined;
    }

    getLocation() {
        return undefined;
    }

    getX1() {
        return undefined;
    }

    getX2() {
        return undefined;
    }

    getY1() {
        return undefined;
    }

    getY2() {
        return undefined;
    }

    getSpatial() {
        return undefined;
    }

    getAdditionalHtml() {
        return undefined;
    }

    getT04Search() {
        return undefined;
    }

    getT0110_avail_format() {
        return undefined;
    }

    getT011_obj_geo() {
        return undefined;
    }

    getT011_obj_geo_keyc() {
        return undefined;
    }

    getT011_obj_geo_symc() {
        return undefined;
    }

    getT011_obj_geo_scale() {
        return undefined;
    }

    getT011_obj_geo_spatial_rep() {
        return undefined;
    }

    getT011_obj_geo_vector() {
        return undefined;
    }

    getT011_obj_geo_supplinfo() {
        return undefined;
    }

    getT011_obj_serv() {
        return undefined;
    }

    getT011_obj_serv_version() {
        return undefined;
    }

    getT011_obj_serv_op_connpoint() {
        return undefined;
    }

    getT011_obj_serv_op_depends() {
        return undefined;
    }

    getT011_obj_serv_op_para() {
        return undefined;
    }

    getT011_obj_serv_operation() {
        return undefined;
    }

    getT011_obj_serv_op_platform() {
        return undefined;
    }

    getT011_obj_topic_cat() {
        return undefined;
    }

    getT012_obj_adr() {
        return undefined;
    }

    getT0113_dataset_reference() {
        return undefined;
    }

    getT017_url_ref() {
        return undefined;
    }

    getT021_communication() {
        return undefined;
    }

    getObjectUse() {
        return undefined;
    }

    getObjectUseConstraint() {
        return undefined;
    }

    getObjectAccess() {
        return undefined;
    }

    isHvd(): boolean {
        return undefined;
    }

    getSpatialSystem() {
        return undefined;
    }

    getHierarchyLevel() {
        return undefined;
    }

    // the pre-migration ("IGC"/t0xx-column-style) document shape. Mirrors the old base-class
    // createIndexDocument() (commit e442e84b) as closely as possible: same field layout, same
    // two-phase content/idf assignment at the end (so idf isn't included in content), reusing what's
    // still alive elsewhere in this class (getHierarchyLevel, getAlternateTitle, getSortUuid) and
    // inlining what was removed since (getIngridMetadata, getMetaMetadata, getDataSourceName - all
    // trivial passthroughs of ImporterSettings/getModifiedDate()).
    protected async buildIngridDeprecatedDocument(): Promise<IngridDeprecatedIndexDocument> {
        const settings = this.baseMapper.settings;
        let result: IngridDeprecatedIndexDocument = {
            // put custom entries first, so they can potentially get overwritten with more specific getters below
            ...this.getCustomEntries(),
            iPlugId: settings.iPlugId,
            partner: settings.partner?.split(',').map(p => p.trim()),
            provider: settings.provider?.split(',').map(p => p.trim()),
            organisation: this.transformToIgcDomainId(settings.provider, "111"),
            datatype: settings.datatype?.split(',').map(p => p.trim()) ?? ["default"],
            dataSourceName: settings.dataSourceName,
            boost: settings.boost,
            // TODO change to boolean when IGE maps correctly
            isfolder: "false",
            metadata: {
                created: null, // TODO
                modified: this.getModifiedDate(),
            },
            uuid: this.getGeneratedId(),
            collection: {
                name: settings.dataSourceName,
            },
            extras: {
                hierarchy_level: this.getHierarchyLevel(),
                metadata: {
                    harvested: this.baseMapper.getHarvestingDate(),
                    harvesting_errors: null, // get errors after all operations been done
                    issued: null,
                    is_valid: null, // check validity before persisting to ES
                    modified: null,
                    source: this.baseMapper.getMetadataSource(),
                    merged_from: []
                }
            },
            // getDistributions() was retyped for the new opendata shape (IngridOpendataDistribution,
            // incompatible with the old Distribution type here) - use getDistributionsDeprecated()
            // instead, which format-specific subclasses override to match their own old behavior.
            distributions: await this.getDistributionsDeprecated(),
            t0: this.getT0(),
            t1: this.getT1(),
            t01_object: this.getT01_object(),
            t2: this.getT2(),
            hierarchylevel: this.getHierarchyLevel(),
            alternatetitle: this.getAlternateTitleDeprecated(),
            t02_address: this.getAddress(),
            title: this.getTitle(),
            summary: this.getDescription(),
            location: this.getLocation(),
            x1: this.getX1(),
            x2: this.getX2(),
            y1: this.getY1(),
            y2: this.getY2(),
            spatial: {
                geometries: this.getSpatial()
            },
            modified: this.getModifiedDate(),
            capabilities_url: this.getCapabilitiesURL(),
            additional_html_1: this.getAdditionalHtml(),
            t04_search: this.getT04Search(),
            t0110_avail_format: this.getT0110_avail_format(),
            t011_obj_geo: this.getT011_obj_geo(),
            t011_obj_geo_keyc: this.getT011_obj_geo_keyc(),
            t011_obj_geo_symc: this.getT011_obj_geo_symc(),
            t011_obj_geo_scale: this.getT011_obj_geo_scale(),
            t011_obj_geo_spatial_rep: this.getT011_obj_geo_spatial_rep(),
            t011_obj_geo_vector: this.getT011_obj_geo_vector(),
            t011_obj_geo_supplinfo: this.getT011_obj_geo_supplinfo(),
            t011_obj_serv: this.getT011_obj_serv(),
            t011_obj_serv_version: this.getT011_obj_serv_version(),
            t011_obj_serv_op_connpoint: this.getT011_obj_serv_op_connpoint(),
            t011_obj_serv_op_depends: this.getT011_obj_serv_op_depends(),
            t011_obj_serv_op_para: this.getT011_obj_serv_op_para(),
            t011_obj_serv_operation: this.getT011_obj_serv_operation(),
            t011_obj_serv_op_platform: this.getT011_obj_serv_op_platform(),
            t011_obj_topic_cat: this.getT011_obj_topic_cat(),
            t012_obj_adr: this.getT012_obj_adr(),
            t0113_dataset_reference: this.getT0113_dataset_reference(),
            t017_url_ref: this.getT017_url_ref(),
            t021_communication: this.getT021_communication(),
            object_use: this.getObjectUse(),
            object_use_constraint: this.getObjectUseConstraint(),
            object_access: this.getObjectAccess(),
            is_hvd: this.isHvd(),
            spatial_system: this.getSpatialSystem(),
            sort_hash: this.getSortUuid(),
            content: null, // assigned after
            idf: null // assigned after
        };
        result.content = this.getContent(result);
        // add "idf" at the end, so it does not get included in the "content" array
        result.idf = this.getIDF();
        return result;
    }

    private static readonly CONTENT_EXCLUDED_KEYS = new Set(['role', 'isfolder', 'boost']);

    // generic recursive flattener used to populate the deprecated shapes' "content" field (a flat
    // array of every primitive value in the document, used for full-text search in the old index
    // format). Excludes a few keys that aren't meaningful full-text content, and only pulls the
    // `.term` out of keyword entries (not the whole {id, term, source} object).
    protected getContent(resultObj: any): string[] {
        const values = [];
        const traverse = (obj: any, key?: string) => {
            if (obj == null || ingridMapper.CONTENT_EXCLUDED_KEYS.has(key)) {
                return;
            }
            if (typeof obj !== 'object') {
                values.push(obj);
                return;
            }
            // keywords are {id, term, source} objects; only the term is actual full-text content
            if (key === 'keywords' && Array.isArray(obj)) {
                obj.forEach(keyword => traverse(keyword?.term));
                return;
            }
            Object.entries(obj).forEach(([k, v]) => traverse(v, k));
        };
        traverse(resultObj);
        return values;
    }

    protected hasValue(val) {
        if (typeof val == "undefined") {
            return false;
        } else if (val == null) {
            return false;
        } else if (typeof val == "string" && val == "") {
            return false;
        } else if (typeof val == "object" && Object.keys(val).length === 0) {
            return false;
        } else {
            return true;
        }
    }

    protected formatDate(date: Date){
        if (!date) {
            return null;
        }
        return date.getFullYear()
            +(date.getMonth()+1).toString().padStart(2, "0")
            +date.getDate().toString().padStart(2, "0")
            +date.getHours().toString().padStart(2, "0")
            +date.getMinutes().toString().padStart(2, "0")
            +date.getSeconds().toString().padStart(2, "0")
            +date.getMilliseconds().toString().padStart(3, "0").substring(0,3);
    }

    protected transformToIgcDomainId(value, codelist) {
        var id = Codelist.getInstance().getId(codelist, value)
        return id
    }

    protected transformGeneric(value, map, defaultValue){
        return map[value] ?? defaultValue;
    }

}
