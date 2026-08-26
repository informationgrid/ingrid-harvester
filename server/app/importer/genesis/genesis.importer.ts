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
    // shared across the whole harvest run: caps the number of GENESIS requests in flight at
    // any time to settings.maxConcurrent, regardless of which stage (statistics/tables/metadata)
    // issues them, instead of each stage/statistic multiplying concurrency independently
    private requestLimit: ReturnType<typeof pLimit>;

    constructor(settings: GenesisSettings) {
        super(settings);
    }

    protected getDefaultSettings(): GenesisSettings {
        return genesisDefaults;
    }

    protected async harvest(): Promise<number> {
        log.info(`Started requesting records`);
        this.numIndexDocs = 0;
        this.requestLimit = pLimit(this.settings.maxConcurrent);

        const harvestTime = new Date();
        const statisticCodes = this.settings.typeConfig.statisticCodes;

        // Stage 1: collect all statistics across all selections
        const allStatistics: GenesisListEntry[] = [];
        this.observer.next(this.summary.msgImport(`Fetching statistics`));
        await Promise.allSettled(
            statisticCodes.map(async selection => {
                log.debug(`Fetching statistics for selection "${selection}"`);
                try {
                    const statistics = await this.fetchStatisticList(selection);
                    if (statistics.length === 0) {
                        log.warn(`Selection "${selection}": no statistics found [${this.endpointUrl('/catalogue/statistics')}]`);
                        this.summary.warnings.push([selection, 'No statistics found for this selection']);
                    } else {
                        log.info(`Selection "${selection}": ${statistics.length} statistics`);
                    }
                    allStatistics.push(...statistics);
                    this.observer.next(this.summary.msgImport(`Selection "${selection}": ${statistics.length} statistics found`));
                } catch (e) {
                    log.warn(`Failed to fetch statistics for selection "${selection}" [${this.endpointUrl('/catalogue/statistics')}]: ${e.message}`);
                    this.summary.warnings.push([selection, `Failed to fetch statistics: ${e.message}`]);
                    this.summary.numErrors++;
                }
            })
        );
        this.totalRecords = allStatistics.length;
        log.info(`Total statistics to harvest: ${this.totalRecords}`);

        // Stage 2: process each statistic
        await Promise.allSettled(
            allStatistics.map(stat => this.processStatistic(stat, harvestTime))
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
        try {
            await this.processStatisticData(entry, harvestTime);
        } finally {
            // reported on completion (not on start) so progress advances as statistics actually
            // finish, rather than jumping to the total almost immediately once every statistic
            // has merely been kicked off
            this.observer.next(this.summary.msgRunning(++this.numIndexDocs, this.totalRecords, this.getDownloadMessage()));
        }
    }

    private async processStatisticData(entry: GenesisListEntry, harvestTime: Date): Promise<void> {
        if (!this.filterUtils.isIdAllowed(entry.Code)) {
            this.summary.skippedDocs.push(entry.Code);
            return;
        }

        // Fetch statistic metadata
        let statisticMetadata: any;
        try {
            statisticMetadata = await this.fetchStatisticMetadata(entry.Code);
        } catch (e) {
            log.warn(`Failed to fetch statistic metadata for ${entry.Code} [${this.endpointUrl('/metadata/statistic')}]: ${e.message}`);
            this.summary.warnings.push([entry.Code, `Failed to fetch statistic metadata: ${e.message}`]);
            this.summary.skippedDocs.push(entry.Code);
            return;
        }

        if (!statisticMetadata?.Object) {
            log.warn(`No metadata returned for statistic ${entry.Code} [${this.endpointUrl('/metadata/statistic')}]`);
            this.summary.warnings.push([entry.Code, `No metadata returned`]);
            this.summary.skippedDocs.push(entry.Code);
            return;
        }

        // Fetch tables and their metadata
        let tableEntries: GenesisListEntry[] = [];
        try {
            tableEntries = await this.fetchTableList(entry.Code);
        } catch (e) {
            log.warn(`Failed to fetch table list for ${entry.Code} [${this.endpointUrl('/catalogue/tables')}]: ${e.message}`);
            this.summary.warnings.push([entry.Code, `Failed to fetch table list: ${e.message}`]);
            this.summary.skippedDocs.push(entry.Code);
            return;
        }
        const tables: any[] = [];
        let completedTables = 0;
        await Promise.allSettled(
            tableEntries.map(async tableEntry => {
                try {
                    const tableMetadata = await this.fetchTableMetadata(tableEntry.Code);
                    if (tableMetadata?.Object) {
                        tables.push(tableMetadata);
                    }
                } catch (e) {
                    log.warn(`Failed to fetch table metadata for ${tableEntry.Code} [${this.endpointUrl('/metadata/table')}]: ${e.message}`);
                    this.summary.warnings.push([tableEntry.Code, `Failed to fetch table metadata: ${e.message}`]);
                } finally {
                    completedTables++;
                    this.observer.next(this.summary.msgRunning(completedTables, tableEntries.length,
                        `${this.numIndexDocs}/${this.totalRecords} Statistiken – Statistik ${entry.Code}: Tabellen werden geladen`));
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
            await this.database.addEntityToBulk(entity)
                .catch(err => {
                    log.error(`Error saving entity ${entry.Code}`, err);
                    this.summary.errors.push({ type: 'app', error: `DB error for ${entry.Code}: ${err.message}` });
                });
        } else if (mapper.shouldBeSkipped()) {
            this.summary.skippedDocs.push(entry.Code);
        }

    }

    // -------------------------------------------------------------------------
    // Pagination helper
    // -------------------------------------------------------------------------

    /**
     * Fetches all pages of a catalogue endpoint, accumulating results.
     *
     * The GENESIS API uses a 1-based `start` offset alongside `pagelength`.
     * Pagination continues as long as the returned list equals the page size.
     * Pacing between requests (including between pages) is handled centrally
     * by `doApiRequest`.
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
        }

        return allItems;
    }

    // -------------------------------------------------------------------------
    // HTTP
    // -------------------------------------------------------------------------

    /**
     * Performs a single authenticated API request to the GENESIS endpoint.
     *
     * All requests are funneled through a single, shared concurrency limiter
     * (`this.requestLimit`, sized by `settings.maxConcurrent`) and paced by
     * `typeConfig.requestDelayMs` before being sent, so the number of requests in
     * flight - and the rate at which new ones start - stays bounded and even across
     * the whole harvest run, regardless of which stage (statistics/tables/metadata)
     * or how many statistics are being processed at once.
     *
     * Returns parsed JSON. Throws on authentication errors (Status 98/99).
     * Returns null for "not found" (Status 104).
     * Retries up to 2 times on network errors with a 1 second backoff (handled by
     * RequestDelegate), and up to MAX_STATUS_ATTEMPTS times with a growing backoff
     * when GENESIS returns a response without the expected Status (a sign that the
     * request was dropped or throttled server-side rather than a real error).
     */
    protected async doApiRequest(path: string, params: Record<string, string> = {}): Promise<any> {
        return this.requestLimit(() => this.performApiRequest(path, params));
    }

    private static readonly MAX_STATUS_ATTEMPTS = 3;

    private async performApiRequest(path: string, params: Record<string, string> = {}): Promise<any> {
        const body = new URLSearchParams(params).toString();
        const uri = this.endpointUrl(path);
        const config: RequestOptions = {
            method: 'POST',
            uri,
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

        for (let attempt = 1; attempt <= GenesisImporter.MAX_STATUS_ATTEMPTS; attempt++) {
            await this.sleep(this.settings.typeConfig.requestDelayMs);

            log.debug(`POST ${path} [${uri}] ${body}`);
            const response = await RequestDelegate.doRequest(config, 2, 1000);

            const statusCode: number = response?.Status?.Code;
            const statusContent: string = response?.Status?.Content;

            if (statusCode === 98 || statusCode === 99) {
                throw new Error(`GENESIS authentication failed (Status ${statusCode}) for ${path} [${uri}]: ${statusContent}`);
            }

            if (statusCode === 104) {
                log.debug(`GENESIS object not found (Status 104) for ${path} [${uri}]: ${statusContent}`);
                return null;
            }

            if (statusCode === 0 || statusCode === 22) {
                return response;
            }

            // missing/unexpected Status - likely a dropped or throttled response; retry with backoff
            if (attempt < GenesisImporter.MAX_STATUS_ATTEMPTS) {
                const backoffMs = this.settings.typeConfig.requestDelayMs * attempt;
                log.warn(`Unexpected GENESIS status ${statusCode} for ${path} [${uri}]: ${statusContent}; Request Body: ${body} — retrying (attempt ${attempt + 1}/${GenesisImporter.MAX_STATUS_ATTEMPTS}) after ${backoffMs}ms`);
                await this.sleep(backoffMs);
            } else {
                log.warn(`Unexpected GENESIS status ${statusCode} for ${path} [${uri}] after ${GenesisImporter.MAX_STATUS_ATTEMPTS} attempts: ${statusContent}; Request Body: ${body}`);
                return response;
            }
        }
    }

    private endpointUrl(path: string): string {
        return this.settings.sourceURL + path;
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
