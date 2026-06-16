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

import * as crypto from "crypto";
import log4js from 'log4js';
import type { CkanMapper } from "../../../importer/ckan/ckan.mapper.js";
import type { CswMapper } from "../../../importer/csw/csw.mapper.js";
import type { DcatapdeMapper } from '../../../importer/dcatapde/dcatapde.mapper.js';
import type { GenesisMapper } from "../../../importer/genesis/genesis.mapper.js";
import type { ToElasticMapper } from '../../../importer/to.elastic.mapper.js';
import type { WfsMapper } from '../../../importer/wfs/wfs.mapper.js';
import type { DocumentFactory } from "../../../model/index.document.factory.js";
import type { IndexContact, IndexKeyword, IndexSpatial, IndexTemporal } from '../../../model/index.document.js';
import type {
    IngridConformanceResult,
    IngridDataQuality,
    IngridIndexDocument,
    IngridLicense,
    IngridReference,
    IngridSpatialRepresentation,
    IngridSpecific
} from "../model/index.document.js";
import { Codelist } from "../utils/codelist.js";

export type ingridMapperType = CswMapper | CkanMapper | DcatapdeMapper | WfsMapper | GenesisMapper;

export abstract class ingridMapper<M extends ingridMapperType> implements DocumentFactory<IngridIndexDocument>, ToElasticMapper<IngridIndexDocument> {

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

    async createIndexDocument(): Promise<IngridIndexDocument> {
        let result: IngridIndexDocument = {
            ...this.getCustomEntries(),
            id: this.getGeneratedId(),
            schema_version: '8.4.0', // TODO: align with app release version
            metadata: {
                data_type: 'INGRID',
                created: null,  // TODO: populate from source record
                modified: this.getModifiedDate()?.toISOString() ?? null,
                partner: this.baseMapper.settings.partner?.split(',').map(p => p.trim())[0],
                provider: this.baseMapper.settings.provider?.split(',').map(p => p.trim())[0],
                datasource: {
                    id: this.baseMapper.settings.dataSourceName,
                    name: this.baseMapper.settings.dataSourceName,
                }
            },
            title: this.getTitle(),
            sort_uuid: this.getSortUuid(),
            description: this.getDescription(),
            contacts: this.getContacts(),
            spatials: this.getSpatials(),
            temporal: this.getTemporal(),
            keywords: this.getKeywords(),
            exports: null,
            ingrid: this.getIngrid(),
            fulltext: null,  // assigned after
        };
        result.fulltext = this.getFulltext(result);
        // add "exports.iso" at the end, so it does not get included in the "content" array
        result.exports = this.getExports();

        this.executeCustomCode(result);
        return result;
    }

    protected getFulltext(resultObj: object): string[] {
        const values = [];
        const traverse = obj => {
            if (obj == null) return;
            if (typeof obj !== 'object') {
                values.push(obj);
                return;
            }
            Object.values(obj).forEach(traverse);
        };
        traverse(resultObj);
        return values;
    }

    getIngrid(): IngridSpecific {
        return {
            alternate_title: this.getAlternateTitle()?.[0],
            references: this.getReferences(),
            licenses: this.getLicenses(),
            parent_identifier: this.getParentIdentifier(),
            datasource_identifier: this.getDatasourceIdentifier(),
            spatial_representation: this.getSpatialRepresentation(),
            specific_usage: this.getSpecificUsage(),
            purpose: this.getPurpose(),
            conformance_result: this.getConformanceResult(),
            order_info: this.getOrderInfo(),
            data_quality: this.getDataQuality(),
        };
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

    getReferences(): IngridReference[] {
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

    getSortUuid(): string {
        return crypto.createHash('sha1').update(this.getTitle(), 'binary').digest('hex');
    }

    getContacts(): IndexContact[] {
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

    getExports(): { iso?: string } {
        return { iso: this.getIso() };
    }

    getIso(): string {
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
