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

import log4js from 'log4js';
import pLimit from 'p-limit';
import type { RecordEntity } from '../../model/entity.js';
import type { IndexDocument } from '../../model/index.document.js';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader.js';
import type { RequestOptions } from '../../utils/http-request.utils.js';
import { RequestDelegate } from '../../utils/http-request.utils.js';
import { Importer } from '../importer.js';
import { GenesisMapper } from "./genesis.mapper.js";
import { genesisDefaults, type GenesisSettings } from './genesis.settings.js';

const log = log4js.getLogger(import.meta.filename);

/**
 * A single entry from a GENESIS catalogue list endpoint
 * (e.g. /catalogue/statistics, /catalogue/tables).
 */
export interface GenesisListEntry {
    Code: string;
    Content: string;
}

/**
 * Base harvester for the GENESIS Online REST API.
 *
 * Harvest workflow for each statistic in `typeConfig.statisticCodes`:
 *   A) Fetch matching statistics  → /catalogue/statistics?selection={pattern}
 *   B) For each statistic:
 *      - Fetch statistic metadata  → /metadata/statistic?name={code}
 *      - Fetch matching tables     → /catalogue/tables?selection={code}*
 *      - For each table, fetch metadata → /metadata/table?name={code}
 *   C) Build one record per statistic; tables become dcat:Distribution entries.
 */
export class GenesisImporter extends Importer<GenesisSettings> {

    private totalRecords = 0;
    private numIndexDocs = 0;

    constructor(settings: GenesisSettings) {
        super(settings);
    }

    protected getDefaultSettings(): GenesisSettings {
        return genesisDefaults;
    }

    protected async harvest(): Promise<number> {
        log.info(`Started requesting records`);
        this.numIndexDocs = 0;

        const harvestTime = new Date();
        const statisticCodes = this.settings.typeConfig.statisticCodes;

        // Stage 1: collect all statistics across all selections
        const allStatistics: GenesisListEntry[] = [];
        this.observer.next(this.summary.msgImport(`Fetching statistics`));
        const selectionLimit = pLimit(this.settings.maxConcurrent);
        await Promise.allSettled(
            statisticCodes.map(selection => selectionLimit(async () => {
                log.debug(`Fetching statistics for selection "${selection}"`);
                try {
                    const statistics = await this.fetchStatisticList(selection);
                    log.info(`Selection "${selection}": ${statistics.length} statistics`);
                    allStatistics.push(...statistics);
                    this.observer.next(this.summary.msgImport(`Selection "${selection}": ${statistics.length} statistics found`));
                } catch (e) {
                    log.warn(`Failed to fetch statistics for selection "${selection}": ${e.message}`);
                    this.summary.errors.push({ type: 'app', error: `Failed to fetch statistics for "${selection}": ${e.message}` });
                }
            }))
        );
        this.totalRecords = allStatistics.length;
        log.info(`Total statistics to harvest: ${this.totalRecords}`);

        // Stage 2: process each statistic
        const limit = pLimit(this.settings.maxConcurrent);
        await Promise.allSettled(
            allStatistics.map(stat => limit(() => this.processStatistic(stat, harvestTime)))
        );

        await this.database.sendBulkData();
        return this.numIndexDocs;
    }

    // -------------------------------------------------------------------------
    // Endpoint-isolated fetch functions
    // -------------------------------------------------------------------------

    /** Fetches all statistics matching a selection pattern. */
    private async fetchStatisticList(selection: string): Promise<GenesisListEntry[]> {
        return this.fetchAllPages('/catalogue/statistics', {
            selection, area: 'all', searchcriterion: 'Code', sortcriterion: 'Code', language: 'de'
        });
    }

    /** Fetches full metadata for a single statistic. */
    private async fetchStatisticMetadata(code: string): Promise<any> {
        return this.doApiRequest('/metadata/statistic', { name: code, language: 'de' });
    }

    /** Fetches the list of tables belonging to a statistic. */
    private async fetchTableList(statisticCode: string): Promise<GenesisListEntry[]> {
        return this.fetchAllPages('/catalogue/tables', {
            selection: statisticCode + '*', area: 'all', searchcriterion: 'Code', sortcriterion: 'Code', language: 'de'
        });
    }

    /** Fetches full metadata for a single table. */
    private async fetchTableMetadata(code: string): Promise<any> {
        return this.doApiRequest('/metadata/table', { name: code, language: 'de' });
    }

    // -------------------------------------------------------------------------
    // Processing
    // -------------------------------------------------------------------------

    private async processStatistic(entry: GenesisListEntry, harvestTime: Date): Promise<void> {
        this.summary.numDocs++;

        if (!this.filterUtils.isIdAllowed(entry.Code)) {
            this.summary.skippedDocs.push(entry.Code);
            return;
        }

        // Fetch statistic metadata
        let statisticMetadata: any;
        try {
            statisticMetadata = await this.fetchStatisticMetadata(entry.Code);
        } catch (e) {
            log.error(`Failed to fetch statistic metadata for ${entry.Code}: ${e.message}`);
            this.summary.errors.push({ type: 'app', error: `Failed to fetch statistic metadata for ${entry.Code}: ${e.message}` });
            return;
        }

        if (!statisticMetadata?.Object) {
            log.warn(`No metadata returned for statistic ${entry.Code}`);
            this.summary.skippedDocs.push(entry.Code);
            return;
        }

        // Fetch tables and their metadata
        const tableEntries = await this.fetchTableList(entry.Code);
        const tables: any[] = [];
        await Promise.allSettled(
            tableEntries.map(async tableEntry => {
                try {
                    const tableMetadata = await this.fetchTableMetadata(tableEntry.Code);
                    if (tableMetadata?.Object) {
                        tables.push(tableMetadata);
                    }
                } catch (e) {
                    log.warn(`Failed to fetch table metadata for ${tableEntry.Code}: ${e.message}`);
                }
            })
        );

        // Merge tables into the statistic record
        const record = { ...statisticMetadata, Tables: tables };

        // Create index document
        const mapper = new GenesisMapper(this.settings, record, harvestTime, this.summary);
        const documentFactory = ProfileFactoryLoader.get().getDocumentFactory(mapper);

        let doc: IndexDocument;
        let dcatapdeDoc: string;
        try {
            doc = await documentFactory.createIndexDocument();
            dcatapdeDoc = documentFactory.createDcatapdeDocument();
        } catch (e) {
            log.error(`Error creating index document for statistic ${entry.Code}`, e);
            this.summary.errors.push({ type: 'app', error: `Error creating document for ${entry.Code}: ${e.message}` });
            mapper.skipped = true;
        }

        if (!this.settings.dryRun && !mapper.shouldBeSkipped()) {
            const entity: RecordEntity = {
                identifier: mapper.getGeneratedId(),
                source: this.settings.sourceURL,
                catalog_ids: this.settings.catalogIds,
                dataset: doc,
                dataset_dcatapde: dcatapdeDoc,
                original_document: mapper.getHarvestedData(),
            };
            await this.addEntityToBulk(entity)
                .catch(err => {
                    log.error(`Error saving entity ${entry.Code}`, err);
                    this.summary.errors.push({ type: 'app', error: `DB error for ${entry.Code}: ${err.message}` });
                });
        } else if (mapper.shouldBeSkipped()) {
            this.summary.skippedDocs.push(entry.Code);
        }

        this.observer.next(this.summary.msgRunning(++this.numIndexDocs, this.totalRecords, this.getDownloadMessage()));
    }

    // -------------------------------------------------------------------------
    // Pagination helper
    // -------------------------------------------------------------------------

    /**
     * Fetches all pages of a catalogue endpoint, accumulating results.
     *
     * The GENESIS API uses a 1-based `start` offset alongside `pagelength`.
     * Pagination continues as long as the returned list equals the page size.
     */
    private async fetchAllPages(path: string, params: Record<string, string>): Promise<GenesisListEntry[]> {
        const pageLength = 2500;
        let start = 1;
        const allItems: GenesisListEntry[] = [];

        while (true) {
            const response = await this.doApiRequest(path, {
                ...params,
                pagelength: String(pageLength),
                start: String(start),
            });

            const list: GenesisListEntry[] = response?.List ?? [];
            allItems.push(...list);

            if (list.length < pageLength) {
                break;
            }

            start += pageLength;
            await this.sleep(this.settings.typeConfig.requestDelayMs);
        }

        return allItems;
    }

    // -------------------------------------------------------------------------
    // HTTP
    // -------------------------------------------------------------------------

    /**
     * Performs a single authenticated API request to the GENESIS endpoint.
     *
     * Returns parsed JSON. Throws on authentication errors (Status 98/99).
     * Returns null and logs a warning for "not found" (Status 104).
     * Retries up to 2 times on network errors with a 1 second backoff.
     */
    protected async doApiRequest(path: string, params: Record<string, string> = {}): Promise<any> {
        const body = new URLSearchParams(params).toString();
        const config: RequestOptions = {
            method: 'POST',
            uri: this.settings.sourceURL + path,
            json: true,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                ...this.buildAuthHeaders(),
            },
            body,
            proxy: this.settings.proxy ?? null,
            rejectUnauthorized: this.settings.rejectUnauthorizedSSL,
            timeout: this.settings.timeout,
        };

        log.debug(`POST ${config.uri} [${body}]`);

        const response = await RequestDelegate.doRequest(config, 2, 1000);

        const statusCode: number = response?.Status?.Code;
        const statusContent: string = response?.Status?.Content;

        if (statusCode === 98 || statusCode === 99) {
            throw new Error(`GENESIS authentication failed (Status ${statusCode}): ${statusContent}`);
        }

        if (statusCode === 104) {
            log.warn(`GENESIS object not found at ${path} (Status 104): ${statusContent}`);
            return null;
        }

        if (statusCode !== 0 && statusCode !== 22) {
            log.warn(`Unexpected GENESIS status ${statusCode} for ${path}: ${statusContent}`);
        }

        return response;
    }

    protected buildAuthHeaders(): Record<string, string> {
        const { apiToken, username, password } = this.settings.typeConfig;
        if (apiToken) {
            return { username: apiToken };
        }
        return {
            username: username ?? 'Gast',
            password: password ?? 'Gast',
        };
    }

    private async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
