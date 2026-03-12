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

import type { ImporterSettings } from '../importer.settings.js';
import type { RecordEntity } from '../model/entity.js';
import type { Summary } from '../model/summary.js';
import type { Bucket } from '../persistence/postgres.utils.js';

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

    constructor(settings: CatalogSettings, summary: Summary) {
        this.settings = settings;
        this.summary = summary;
    }

    // TODO use transaction start date - type as Date
    async process(transactionHandle: any, importerSettings: ImporterSettings): Promise<void> {
        this.prepareImport(transactionHandle, importerSettings);
        this.import(transactionHandle, importerSettings);
        this.postImport(transactionHandle, importerSettings);
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

    abstract postImport(transactionHandle: any, importerSettings: ImporterSettings): Promise<void>;

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

export type ElasticsearchCatalogSettings = CatalogSettings & {
    settings: {
        index: string,
        alias: string,
    }
}

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