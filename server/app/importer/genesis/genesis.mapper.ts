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
import type { Summary } from '../../model/summary.js';
import { Mapper } from '../mapper.js';
import type { GenesisSettings } from './genesis.settings.js';
import { generateUuid } from "../../profiles/ingrid/ingrid.utils.js";
import dayjs from '../../utils/dayjs.js';
import { DcatLicensesUtils } from '../../utils/dcat.licenses.utils.js';

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

    getMetadataSourceType(): string {
        return 'GENESIS';
    }

    getTitle(): string {
        return this.record?.Object?.Content ?? '';
    }

    getDescription(): string {
        return this.record?.Object?.Information ?? this.getTitle();
    }

    getModifiedDate(): Date {
        return this.parseGenesisDate(this.record.Object.Updated);
    }

    getCode(): string {
        return this.record?.Object?.Code ?? '';
    }

    getGeneratedId(): string {
        return generateUuid([this.settings.partner, this.getCode()])
    }

    getTemporal(): DateRange | undefined {
        const from = this.record?.Object?.Time?.From;
        const to = this.record?.Object?.Time?.To;
        if (!from && !to) return undefined;
        const context = { endpoint: '/metadata/statistic', code: this.getCode() };
        return {
            gte: from ? this.parseTemporalBound(from, false, context) : undefined,
            lte: to   ? this.parseTemporalBound(to,   true, context)  : undefined,
        };
    }

    private parseTemporalBound(value: string, isEnd: boolean, context: { endpoint: string; code: string }): Date | undefined {
        const year = dayjs(value, 'YYYY', true);
        if (year.isValid()) {
            const y = year.year();
            return isEnd ? new Date(y, 11, 31) : new Date(y, 0, 1);
        }
        const date = dayjs(value, 'DD.MM.YYYY', true);
        if (date.isValid()) return date.toDate();

        const splitYearRange = this.parseSplitYearRange(value, isEnd);
        if (splitYearRange) return splitYearRange;

        this.log.warn(`getTemporal: unrecognised date format "${value}" for code ${context.code} [${this.settings.sourceURL}${context.endpoint}]`);
        return undefined;
    }

    /**
     * Parses a split fiscal/reporting year like "2007/08" (meaning 2007/2008): the "From" bound
     * uses the first (full) year, the "To" bound uses the second, two-digit year expanded into
     * the same century as the first year (e.g. "08" -> 2008).
     */
    private parseSplitYearRange(value: string, isEnd: boolean): Date | undefined {
        const match = value.match(/^(\d{4})\/(\d{2})$/);
        if (!match) return undefined;

        const fromYear = parseInt(match[1], 10);
        if (!isEnd) {
            return new Date(fromYear, 0, 1);
        }

        const century = Math.floor(fromYear / 100) * 100;
        let toYear = century + parseInt(match[2], 10);
        if (toYear <= fromYear) {
            toYear += 100;
        }
        return new Date(toYear, 11, 31);
    }

    getKeywords(): string[] {
        const contents = new Set<string>();
        for (const table of this.record?.Tables ?? []) {
            const structure = table?.Object?.Structure;
            if (!structure) continue;
            this.collectContent(structure.Head, contents);
            (structure.Columns ?? []).forEach(col => this.collectContent(col, contents));
            (structure.Rows   ?? []).forEach(row => this.collectContent(row, contents));
        }
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

    getContact() {
        const contacts = [];
        if (this.getPublisher()?.name) {
            contacts.push({
                name: this.getPublisher().name,
                role: 10
            })
        }
        return contacts
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

    getSpatialUri(): string | undefined {
        return this.settings.typeConfig.spatialUri;
    }

    getLandingPageUrl(): string | undefined {
        const template = this.settings.typeConfig.statisticUrlTemplate;
        if (!template) return undefined;
        return template.replace('{code}', this.getCode());
    }

    getFrequency(): string | undefined {
        const entries: { From: string; To: string | null; Type: string }[] =
            this.record?.Object?.Frequency ?? [];
        if (!entries.length) return undefined;
        const active = entries.find(e => e.To === null)
            ?? entries.reduce((latest, e) => e.From > latest.From ? e : latest);
        return active.Type;
    }

    getDistributions(): Distribution[] {
        const template = this.settings.typeConfig.tableUrlTemplate;
        if (!template) return [];
        const license = this.getDistributionLicense();
        return (this.record?.Tables ?? [])
            .filter(table => table?.Object?.Code)
            .map(table => {
                const context = { endpoint: '/metadata/table', code: table.Object.Code };
                return <Distribution>{
                    access_url: template.replace('{code}', table.Object.Code),
                    format: ['text/html'],
                    title: table.Object.Content ?? '',
                    modified: table.Object.Updated ? this.parseGenesisDate(table.Object.Updated) : undefined,
                    temporal: (table.Object.Time?.From || table.Object.Time?.To) ? {
                        gte: table.Object.Time?.From ? this.parseTemporalBound(table.Object.Time.From, false, context) : undefined,
                        lte: table.Object.Time?.To   ? this.parseTemporalBound(table.Object.Time.To,   true, context)  : undefined,
                    } : undefined,
                    license,
                };
            });
    }

    private getDistributionLicense(): Distribution['license'] {
        const licenseUrl = this.settings.typeConfig.licenseUrl;
        if (!licenseUrl) return undefined;
        const license = DcatLicensesUtils.get(licenseUrl);
        return license ? { name: license.title, url: license.url } : { url: licenseUrl };
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
        return dayjs(dateStr.replace('h', ''), 'DD.MM.YYYY HH:mm:ss', true).toDate();
    }

}
