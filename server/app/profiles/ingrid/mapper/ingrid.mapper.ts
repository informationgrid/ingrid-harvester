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
import { Codelist } from "../utils/codelist.js";

export type ingridMapperType = CswMapper | CkanMapper | DcatapdeMapper | WfsMapper | GenesisMapper;

export abstract class ingridMapper<M extends ingridMapperType>
    implements DocumentFactory<IngridIndexDocument | IngridOpendataIndexDocument>, ToElasticMapper<IngridIndexDocument | IngridOpendataIndexDocument> {

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
    getDocumentKind(): 'ingrid' | 'opendata' {
        return this.resolveMappingHint() ?? this.getDefaultDocumentKind();
    }

    // looks up which of getAvailableIndexMappings()'s schemaNames applies to this mapper's target
    // catalogs (this.baseMapper.settings.catalogIds), so a mapper capable of producing more than
    // one document shape (most notably CSW) knows which one to build. Returns undefined if none
    // of the catalogs are Elasticsearch catalogs, or if they resolve to more than one distinct
    // mapping (mixed InGrid/OpenData catalogs for the same import job).
    private resolveMappingHint(): 'ingrid' | 'opendata' | undefined {
        const schemaNames = new Set<string>();
        for (const catalogId of this.baseMapper.settings.catalogIds ?? []) {
            const catalogSettings = CatalogService.getCatalogSettings(catalogId) as Partial<ElasticsearchCatalogSettings>;
            const mappingFile = catalogSettings?.settings?.mappingFile;
            if (!mappingFile) continue;
            const schemaName = ProfileFactoryLoader.get().getAvailableIndexMappings().find(o => o.value === mappingFile)?.schemaName;
            if (schemaName === 'ingrid' || schemaName === 'opendata') {
                schemaNames.add(schemaName);
            }
        }
        if (schemaNames.size === 1) {
            return [...schemaNames][0] as 'ingrid' | 'opendata';
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
    protected getDefaultDocumentKind(): 'ingrid' | 'opendata' {
        return 'ingrid';
    }

    async createIndexDocument(): Promise<IngridIndexDocument | IngridOpendataIndexDocument> {
        const common = {
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

        let result: IngridIndexDocument | IngridOpendataIndexDocument;
        if (this.getDocumentKind() === 'opendata') {
            result = {
                ...common,
                exports: { rdf: await this.getRdf() },
                dcat: this.getDcat(),
                legal_basis: this.getLegalBasis(),
                distributions: await this.getDistributions(),
                political_geocoding_level_uri: this.getPoliticalGeocodingLevelUri(),
            };
        }
        else {
            result = {
                ...common,
                exports: { iso: this.getIso() },
                ingrid: this.getIngrid(),
                crs: this.getCrs(),
            };
        }

        this.executeCustomCode(result);
        return result;
    }

    getIngrid(): IngridSpecific {
        return {
            alternate_title: this.getAlternateTitle()?.[0],
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

    // TODO: no confirmed ISO source element found for this field yet
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

    getMetadataLanguage(): { key: string | null, value: string | null } {
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
