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

import type { Logger } from 'log4js';
import log4js from 'log4js';
import type { IndexDocument, MetadataSource } from '../../model/index.document.js';
import type { Summary } from '../../model/summary.js';
import { Mapper } from '../mapper.js';
import type { ToElasticMapper } from '../to.elastic.mapper.js';
import type { GenesisSettings } from './genesis.settings.js';

/**
 * Base mapper for GENESIS Online REST API records.
 *
 * Phase 1 implementation: produces a minimal IndexDocument containing only the
 * required harvesting metadata. The raw GENESIS JSON is stored as
 * `original_document` by the importer.
 *
 * Profile-specific subclasses (e.g. IngridGenesisMapper) should override
 * `createEsDocument()` to produce a richer target format (e.g. IngridIndexDocument
 * or a DCAT-AP.de representation) once the mapping requirements are defined.
 */
export class GenesisMapper extends Mapper<GenesisSettings> implements ToElasticMapper<IndexDocument> {

    log: Logger = log4js.getLogger(import.meta.filename);

    protected readonly record: any;
    private readonly harvestTime: Date;

    constructor(settings: GenesisSettings, record, harvestTime: Date, summary: Summary) {
        super(settings, summary);
        this.record = record;
        this.harvestTime = harvestTime;
    }

    /**
     * Creates a minimal Elasticsearch/database document.
     * Only the fields required by the IndexDocument base type are populated.
     * Profile-specific subclasses override this for richer output.
     */
    async createEsDocument(): Promise<IndexDocument> {
        return {
            uuid: this.record.Object.Code,
            extras: {
                metadata: this.getHarvestingMetadata(),
            },
        };
    }

    /**
     * Returns the raw harvested data as a JSON string.
     * This is stored as `original_document` in the database.
     */
    getHarvestedData(): string {
        return JSON.stringify(this.record);
    }

    getHarvestingDate(): Date {
        return this.harvestTime;
    }

    getMetadataSource(): MetadataSource {
        return {
            source_base: this.getSettings().sourceURL,
            source_type: 'GENESIS',
            raw_data_source: this.getSettings().sourceURL,
        };
    }

    getTitle(): string {
        return this.record?.Object?.Content ?? '';
    }

    getModifiedDate(): Date {
        return this.parseGenesisDate(this.record.Object.Updated);
    }

    getGeneratedId(): string {
        return this.record?.Object?.Code ?? '';
    }

    private parseGenesisDate(dateStr: string): Date {
        // dateStr = "15.07.2025 11:27:48h"
        dateStr = dateStr.replace('h', '');
        const [datePart, timePart] = dateStr.split(' ');
        const [day, month, year] = datePart.split('.').map(Number);
        const [hours, minutes, seconds] = timePart.split(':').map(Number);
        return new Date(year, month - 1, day, hours, minutes, seconds);
    }

}
