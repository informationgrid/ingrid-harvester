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

import type { CatalogSettings } from '@shared/catalog.js';
import log4js from 'log4js';
import type { Observer } from 'rxjs';
import type { ImporterSettings } from '../importer.settings.js';
import type { CatalogSummary } from '../model/catalog-summary.js';
import type { ImportLogMessage } from '../model/import.result.js';
import type { IndexDocument } from '../model/index.document.js';
import type { Summary } from '../model/summary.js';
import { DatabaseFactory } from '../persistence/database.factory.js';
import type { DatabaseUtils } from '../persistence/database.utils.js';
import type { Bucket } from '../persistence/postgres.utils.js';
import { ConfigService } from '../services/config/ConfigService.js';
import type { CswDataset } from './csw/csw.catalog.js';
import type { PiveauDataset } from './piveau/piveau.catalog.js';

const log = log4js.getLogger('Catalog');

export interface CatalogFactory {
    getCatalog(catalogId: number, summary: Summary): Promise<Catalog<CatalogColumnType, CatalogSettings, CatalogOperation>>;
}

export type CatalogColumnType = CswDataset | IndexDocument | PiveauDataset;

export interface CatalogOperation {
    // TODO
}

/**
 * 
 * DbColumnType specifies the TypeScript type of the database column values that are fetched for this catalog,
 * e.g. string (text, serialized XML), object (JSON), etc.
 */
export abstract class Catalog<C extends CatalogColumnType, S extends CatalogSettings, O extends CatalogOperation> {

    readonly settings: S;
    readonly summary: Summary;
    protected readonly database: DatabaseUtils;
    protected transactionTimestamp: string;
    protected abstract readonly catalogSummary: CatalogSummary;

    constructor(settings: S, summary: Summary) {
        this.settings = settings;
        this.summary = summary;
        this.database = DatabaseFactory.getDatabaseUtils(ConfigService.getGeneralSettings().database, summary);
    }

    // TODO use transaction start date - type as Date
    async process(transactionHandle: any, importerSettings: ImporterSettings, observer: Observer<ImportLogMessage>): Promise<void> {
        this.transactionTimestamp = new Date().toISOString();
        await this.prepareImport(transactionHandle, importerSettings, observer);
        await this.import(transactionHandle, importerSettings, observer);
        await this.postImport(transactionHandle, importerSettings, observer);
        this.catalogSummary.print(log);
    }

    /**
     * Prepare the import into the catalog resource.
     * For example: for elasticsearch catalogs, fetch and store all document metadata from given aliases
     * 
     * @param transactionHandle 
     * @param settings 
     * @param observer 
     */
    async prepareImport(transactionHandle: any, settings: ImporterSettings, observer: Observer<ImportLogMessage>): Promise<void> {
        // can be overwritten by child classes if necessary
    }

    /**
     * Import the database rows matching the transactionHandle into this target catalog.
     * This is done by streaming "buckets" of related database rows,
     * processing these buckets (finding the principal document, deduplication, transformation),
     * and then importing bucket representative(s) into this target catalog.
     * 
     * @param transactionHandle 
     */
    async import(transactionHandle: any, settings: ImporterSettings, observer: Observer<ImportLogMessage>): Promise<void> {
        log.info(`Importing data for transaction: ${transactionHandle}`);
        const bucketGenerator = this.database.streamBuckets<C>(transactionHandle, this.getDatasetColumn(), observer);
        for await (const bucket of bucketGenerator) {
            const ops = await this.processBucket(bucket);
            await this.importIntoCatalog(ops);
        }
        // finish importing
        await this.flushImport();
    }

    /**
     * Handle post import steps for this catalog, e.g. remove stale records.
     * This is called after every harvesting.
     */
    async postImport(transactionHandle: any, importerSettings: ImporterSettings, observer: Observer<ImportLogMessage>): Promise<void> {
        // can be overwritten by child classes if necessary
    }

    abstract processBucket(bucket: Bucket<C>): Promise<O[]>;

    abstract importIntoCatalog(operations: O[]): Promise<void>;

    abstract flushImport(): Promise<void>;

    abstract getDatasetColumn(): string;

    // /**
    //  * Remove records in the target catalog that are no longer present in the current
    //  * harvest. Records belonging to this source are identified by sourceId
    //  * (ImporterSettings.catalogId), which was embedded via addTraceability.
    //  */
    // abstract deleteStaleRecords(sourceId: string): Promise<void>;

    // /**
    //  * Remove ALL records in the target catalog that originated from the given source
    //  * (identified by sourceId = ImporterSettings.catalogId).
    //  * Called when a data source is deleted by a user.
    //  */
    // abstract deleteAllRecordsForCatalog(sourceId: string): Promise<void>;
}
