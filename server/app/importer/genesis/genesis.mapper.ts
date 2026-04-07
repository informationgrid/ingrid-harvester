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
import type { DateRange } from '../../model/dateRange.js';
import type { Distribution } from '../../model/distribution.js';
import type { MetadataSource } from '../../model/index.document.js';
import type { Summary } from '../../model/summary.js';
import { Mapper } from '../mapper.js';
import type { GenesisSettings } from './genesis.settings.js';
import { generateUuid } from "../../profiles/ingrid/ingrid.utils.js";

/**
 * Base mapper for GENESIS Online REST API records.
 *
 * Extracts fields from the raw GENESIS JSON response. Profile-specific mappers
 * (e.g. ingridGenesisMapper) wrap this via composition and implement
 * `createIndexDocument()` to produce the target schema.
 */
export class GenesisMapper extends Mapper<GenesisSettings> {

    log: Logger = log4js.getLogger(import.meta.filename);

    protected readonly record: any;
    private readonly harvestTime: Date;

    constructor(settings: GenesisSettings, record, harvestTime: Date, summary: Summary) {
        super(settings, summary);
        this.record = record;
        this.harvestTime = harvestTime;
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
            source_base: this.settings.sourceURL,
            source_type: 'GENESIS',
            raw_data_source: this.settings.sourceURL,
        };
    }

    getTitle(): string {
        return this.record?.Object?.Content ?? '';
    }

    getDescription(): string {
        return this.getTitle();
    }

    getModifiedDate(): Date {
        return this.parseGenesisDate(this.record.Object.Updated);
    }

    getCode(): string {
        return this.record?.Object?.Code ?? '';
    }

    getGeneratedId(): string {
        return generateUuid([this.settings.typeConfig.state, this.getCode()])
    }

    getTemporal(): DateRange | undefined {
        const from = this.record?.Object?.Time?.From;
        const to = this.record?.Object?.Time?.To;
        if (!from && !to) return undefined;
        return {
            gte: from ? new Date(parseInt(from), 0, 1) : undefined,
            lte: to   ? new Date(parseInt(to),   11, 31) : undefined,
        };
    }

    getKeywords(): string[] {
        const structure = this.record?.Object?.Structure;
        if (!structure) return [];
        const contents = new Set<string>();
        this.collectContent(structure.Head, contents);
        (structure.Columns ?? []).forEach(col => this.collectContent(col, contents));
        (structure.Rows   ?? []).forEach(row => this.collectContent(row, contents));
        return Array.from(contents);
    }

    getLanguage(): string | undefined {
        return this.record?.Parameter?.language;
    }

    getCopyright(): string | undefined {
        return this.record?.Copyright;
    }

    getPublisher(): { name: string; email?: string } | undefined {
        return this.settings.typeConfig.publisher;
    }

    getTheme(): string | undefined {
        return this.settings.typeConfig.theme;
    }

    getLicenseUrl(): string | undefined {
        return this.settings.typeConfig.licenseUrl;
    }

    getContributorId(): string | undefined {
        return this.settings.typeConfig.contributorId;
    }

    getDistributions(): any[] {
        const code = this.getCode();
        const template = this.settings.typeConfig.downloadUrlTemplate;
        if (!code || !template) return [];
        const downloadURL = template.replace('{code}', code);
        return [{
            access_url: downloadURL,
            format: ['text/csv'],
            description: this.getTitle(),
        }];
    }

    private collectContent(node: any, result: Set<string>): void {
        if (!node) return;
        const content = node.Content;
        if (content && content !== 'see parent') result.add(content);
        const children = node.Structure;
        if (!children) return;
        if (Array.isArray(children)) {
            children.forEach(child => this.collectContent(child, result));
        } else {
            this.collectContent(children, result);
        }
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
