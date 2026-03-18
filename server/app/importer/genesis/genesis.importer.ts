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
import { ImportResult } from '../../model/import.result.js';
import type { IndexDocument } from '../../model/index.document.js';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader.js';
import type { RequestOptions } from '../../utils/http-request.utils.js';
import { RequestDelegate } from '../../utils/http-request.utils.js';
import * as MiscUtils from '../../utils/misc.utils.js';
import { Importer } from '../importer.js';
import type { GenesisSettings } from './genesis.settings.js';
import { defaultGenesisSettings } from './genesis.settings.js';
import { GenesisMapper } from "./genesis.mapper.js";

const log = log4js.getLogger(import.meta.filename);

/**
 * A single entry from a GENESIS catalogue list endpoint
 * (e.g. /catalogue/statistics, /catalogue/tables, /catalogue/cubes).
 */
export interface GenesisListEntry {
    Code: string;
    Content: string;
}

/**
 * Base harvester for the GENESIS Online REST API.
 *
 * Harvest workflow for each entry in `typeConfig.tableSelections`:
 *   A) Fetch matching tables  → /catalogue/tables?selection={pattern}
 *   B) For each table, fetch full metadata → /metadata/table?name={code}
 *   C) Normalize and persist each record.
 *
 * Authentication is performed via HTTP request headers (username + password),
 * as specified by the GENESIS Online REST API (OpenAPI spec). All other
 * parameters are sent as a URL-encoded POST body.
 *
 * Rate limiting is controlled by typeConfig.requestDelayMs.
 */
export class GenesisImporter extends Importer<GenesisSettings> {

    private totalRecords = 0;
    private numIndexDocs = 0;
    /** Cached DB catalog ID to avoid repeated lookups */
    private collectionId: number | null = null;

    constructor(settings: GenesisSettings) {
        settings = MiscUtils.merge(defaultGenesisSettings, settings);
        super(settings);
    }

    protected async harvest(): Promise<number> {
        log.info(`Started requesting records`);

        this.numIndexDocs = 0;

        // Pre-fetch the DB collection ID once
        try {
            this.collectionId = (await this.database.getCatalog(this.getSettings().catalogId))?.id ?? null;
        } catch (e) {
            log.error('Failed to retrieve catalog from database', e);
            this.getSummary().appErrors.push('Failed to retrieve catalog: ' + e.message);
            return 0;
        }

        const harvestTime = new Date(Date.now());
        const tableSelections = this.getSettings().typeConfig.tableSelections;

        // Phase 1: collect all tables across all selections to establish total count
        const allTables: GenesisListEntry[] = [];
        this.observer.next(ImportResult.message(`Fetching tables`));
        const selectionLimit = pLimit(this.getSettings().maxConcurrent);
        await Promise.allSettled(
            tableSelections.map(selection => selectionLimit(async () => {
                log.debug(`Fetching tables for selection "${selection}"`);
                try {
                    const tables = await this.fetchAllPages('/catalogue/tables', { selection, area: 'all', searchcriterion: 'Code', sortcriterion: 'Code', language: 'de' });
                    log.info(`Selection "${selection}": ${tables.length} tables`);
                    allTables.push(...tables);
                    this.observer.next(ImportResult.message(`Selection "${selection}": ${tables.length} tables found`));
                } catch (e) {
                    log.warn(`Failed to fetch tables for selection "${selection}": ${e.message}`);
                    this.getSummary().appErrors.push(`Failed to fetch tables for "${selection}": ${e.message}`);
                }
            }))
        );
        this.totalRecords = allTables.length;
        log.info(`Total tables to harvest: ${this.totalRecords}`);

        // Phase 2: process metadata for each collected table
        const limit = pLimit(this.getSettings().maxConcurrent);
        await Promise.allSettled(
            allTables.map(table => limit(() => this.processObject(table, harvestTime)))
        );

        await this.database.sendBulkData();
        return this.numIndexDocs;
    }

    /**
     * Fetches all pages of a catalogue endpoint, accumulating results.
     *
     * The GENESIS API does not use page numbers. Instead it uses a 1-based `start`
     * offset alongside `pagelength`. Pagination continues as long as the returned
     * list equals the page size; a shorter (or empty) list signals the last page.
     *
     * Note: `start` is not reflected in the published OpenAPI spec but is the
     * documented cursor mechanism confirmed by the API behaviour.
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
                break; // Last page reached
            }

            start += pageLength;
            await this.sleep(this.getSettings().typeConfig.requestDelayMs);
        }

        return allItems;
    }

    /**
     * Fetches the full metadata for a single table or cube, normalizes it,
     * and persists it to the database.
     */
    private async processObject(
        entry: GenesisListEntry,
        harvestTime: Date,
    ): Promise<void> {
        this.getSummary().numDocs++;

        if (!this.filterUtils.isIdAllowed(entry.Code)) {
            this.getSummary().skippedDocs.push(entry.Code);
            return;
        }

        // Step C: Fetch metadata
        const endpoint = '/metadata/table';
        let apiResponse: any;
        try {
            apiResponse = await this.doApiRequest(endpoint, { name: entry.Code, language: 'de' });
        } catch (e) {
            log.error(`Failed to fetch metadata for ${endpoint} ${entry.Code}: ${e.message}`);
            this.getSummary().appErrors.push(`Failed to fetch metadata for ${endpoint} ${entry.Code}: ${e.message}`);
            return;
        }

        if (!apiResponse?.Object) {
            log.warn(`No metadata object returned for ${endpoint} ${entry.Code}`);
            return;
        }

        // Create document via profile-specific mapper
        let mapper = new GenesisMapper(this.getSettings(), apiResponse, harvestTime, this.getSummary());
        let documentFactory = ProfileFactoryLoader.get().getDocumentFactory(mapper);

        let doc: IndexDocument;
        let dcatapdeDoc: string;
        try {
            doc = await documentFactory.createIndexDocument();
            dcatapdeDoc = documentFactory.createDcatapdeDocument();
        } catch (e) {
            log.error(`Error creating index document for ${entry.Code}`, e);
            this.getSummary().appErrors.push(`Error creating document for ${entry.Code}: ${e.message}`);
            mapper.skipped = true;
        }

        if (!this.getSettings().dryRun && !mapper.shouldBeSkipped()) {
            const entity: RecordEntity = {
                identifier: mapper.getGeneratedId(),
                source: this.getSettings().sourceURL,
                collection_id: this.collectionId,
                dataset: doc,
                dataset_dcatapde: dcatapdeDoc,
                original_document: mapper.getHarvestedData(),
            };

            await this.database.addEntityToBulk(entity)
                .catch(err => {
                    log.error(`Error saving entity ${entry.Code}`, err);
                    this.getSummary().appErrors.push(`DB error for ${entry.Code}: ${err.message}`);
                });
        } else {
            this.getSummary().skippedDocs.push(entry.Code);
        }

        this.observer.next(ImportResult.running(++this.numIndexDocs, this.totalRecords, this.getDownloadMessage()));
    }

    /**
     * Performs a single authenticated API request to the GENESIS endpoint.
     *
     * Returns parsed JSON. Throws on authentication errors (Status 98/99).
     * Returns null and logs a warning for "not found" (Status 104).
     * Retries up to 2 times on network errors with a 1 second backoff.
     *
     * @param path  API path relative to sourceURL (e.g. '/catalogue/statistics')
     * @param params  Additional query parameters (excluding auth)
     */
    protected async doApiRequest(path: string, params: Record<string, string> = {}): Promise<any> {
        const body = new URLSearchParams(params).toString();
        const config: RequestOptions = {
            method: 'POST',
            uri: this.getSettings().sourceURL + path,
            json: true,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                ...this.buildAuthHeaders(),
            },
            body,
            proxy: this.getSettings().proxy ?? null,
            rejectUnauthorized: this.getSettings().rejectUnauthorizedSSL,
            timeout: this.getSettings().timeout,
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

    /**
     * Builds authentication HTTP headers from the configured credentials.
     * If apiToken is set, it is used as the password with the username 'Gast'.
     * Otherwise username and password from settings are used.
     */
    protected buildAuthHeaders(): Record<string, string> {
        const { apiToken, username, password } = this.getSettings().typeConfig;
        if (apiToken) {
            return { username: apiToken };
        }
        return {
            username: username ?? 'Gast',
            password: password ?? 'Gast',
        };
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
