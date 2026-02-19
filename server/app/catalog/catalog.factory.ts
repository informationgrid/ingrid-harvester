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
import type { ImporterSettings } from '../importer.settings.js';
import type { CatalogSummary } from '../model/catalog-summary.js';
import type { Summary } from '../model/summary.js';
import { DatabaseFactory } from '../persistence/database.factory.js';
import type { DatabaseUtils } from '../persistence/database.utils.js';
import { ConfigService } from '../services/config/ConfigService.js';

const log = log4js.getLogger('Catalog');

export interface CatalogFactory {

    // TODO improve typing
    getCatalog(catalogId: string, summary: Summary): Promise<Catalog<any>>;
}

/**
 * 
 * DbColumnType specifies the TypeScript type of the database column values that are fetched for this catalog,
 * e.g. string (text, serialized XML), object (JSON), etc.
 */
export abstract class Catalog<DbColumnType> {

    readonly settings: CatalogSettings;
    readonly summary: Summary;
    protected readonly database: DatabaseUtils;
    protected transactionTimestamp: string;
    protected abstract readonly catalogSummary: CatalogSummary;

    constructor(settings: CatalogSettings, summary: Summary) {
        this.settings = settings;
        this.summary = summary;
        this.database = DatabaseFactory.getDatabaseUtils(ConfigService.getGeneralSettings().database, summary);
    }

    // TODO use transaction start date - type as Date
    async process(transactionHandle: any, importerSettings: ImporterSettings): Promise<void> {
        this.transactionTimestamp = new Date().toISOString();
        await this.prepareImport(transactionHandle, importerSettings);
        await this.import(transactionHandle, importerSettings);
        await this.postImport(transactionHandle, importerSettings);
        this.catalogSummary.print(log);
    }

    abstract prepareImport(transactionHandle: any, settings: ImporterSettings): Promise<void>;

    /**
     * Import the database rows matching the transactionHandle into this target catalog.
     * 
     * @param transactionHandle 
     */
    abstract import(transactionHandle: any, settings: ImporterSettings): Promise<void>;
    //  {
    //     // fetch rows from DB using transactionHandle
    //     // * fetch datasets in buckets for deduplication purposes ("internal deduplication")
    //     // * either all DATASOURCEs, specified DATASOURCEs (reflexive, transitive), or no DATASOURCEs
    //     // this is a mock; should NOT work with a list, but use a scroll API or similar
    //     const buckets: Bucket<RecordEntity> = this.getDatasets(transactionHandle);
    //     for (let bucket of buckets) {
    //         // "external deduplication" - deduplicate bucket against configured external sources 
    //         // TODO where to configure? how to set up?
    //         bucket = externalDeduplication(bucket);
    //         // write the bucket representation (e.g. the dataset from the bucket with the highest priority) to the target catalog
    //         importIntoCatalog(bucket);
    //     }
    // }

    /**
     * Remove stale records from the target catalog and is called after every harvest.
     */
    async postImport(transactionHandle: any, importerSettings: ImporterSettings): Promise<void> {
        await this.deleteStaleRecords(importerSettings.catalogId);
    }

    /**
     * Embed traceability metadata (transactionTimestamp, sourceId) into a record
     * before pushing it to the target catalog. Format-specific: CSW uses ISO 19139
     * keywords, a JSON catalog would add a metadata field, etc.
     * sourceId is ImporterSettings.catalogId — the identifier of the harvest source.
     */
    abstract addTraceability(record: DbColumnType, transactionTimestamp: string, sourceId: string): DbColumnType;

    /**
     * Remove records in the target catalog that are no longer present in the current
     * harvest. Records belonging to this source are identified by sourceId
     * (ImporterSettings.catalogId), which was embedded via addTraceability.
     */
    abstract deleteStaleRecords(sourceId: string): Promise<void>;

    /**
     * Remove ALL records in the target catalog that originated from the given source
     * (identified by sourceId = ImporterSettings.catalogId).
     * Called when a data source is deleted by a user.
     */
    abstract deleteAllRecordsForCatalog(sourceId: string): Promise<void>;

    abstract transform(rows: DbColumnType[]): DbColumnType[];

    abstract deduplicate(datasets: DbColumnType[]): DbColumnType[];
};

export type CatalogSettings = {
    id: string,
    type: string,
    connectionId: string,
    name: string,
    settings: Record<string, any>,
};

enum ImportType {
    CSW_ISO,
    DCAT,
    DCAT_AP,
    DCAT_AP_DE,
    TRIPLE,
    // ...
};

enum ExportType {
    CSW_ISO,
    DCAT_AP_DE,
    TRIPLE,
    // ...
}