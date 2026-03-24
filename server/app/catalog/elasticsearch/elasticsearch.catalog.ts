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

import type { ElasticsearchCatalogSettings } from '@shared/catalog.js';
import log4js from 'log4js';
import type { Observer } from 'rxjs';
import type { ImporterSettings } from '../../importer.settings.js';
import type { ImportLogMessage } from '../../model/import.result.js';
import type { Summary } from '../../model/summary.js';
import type { DatabaseUtils } from '../../persistence/database.utils.js';
import { ElasticsearchFactory } from '../../persistence/elastic.factory.js';
import type { ElasticsearchUtils } from '../../persistence/elastic.utils.js';
import { Catalog } from '../catalog.factory.js';
import { ElasticsearchCatalogSummary } from './elasticsearch.catalog-summary.js';

const log = log4js.getLogger(import.meta.filename);

export abstract class ElasticsearchCatalog extends Catalog<object> {

    readonly id: string = 'elastic-catalog';
    readonly type: string = 'elasticsearch';

    protected readonly catalogSummary = new ElasticsearchCatalogSummary();

    private readonly elastic: ElasticsearchUtils;

    constructor(catalogSettings: ElasticsearchCatalogSettings, summary: Summary) {
        super(catalogSettings, summary);
        // TODO this is a crutch until we have dedicated connections
        catalogSettings.settings.url = catalogSettings.url;
        this.elastic = ElasticsearchFactory.getElasticUtils(catalogSettings.settings, summary);
    }

    async import(transactionHandle: any, settings: ImporterSettings, observer: Observer<ImportLogMessage>): Promise<void> {
        // import data into Elasticsearch catalog
        log.info(`Importing data for transaction: ${transactionHandle}`);
        
        // TODO split this into
        // 1) bucket fetching (put into abstract Catalog)
        // 2) transformation, coupling, deduplication (abstract method/s, handle in profile-specific catalogs)
        // 3) push to target (here, ES)
        await this.database.pushToElasticsearch(this.elastic, transactionHandle, observer);
    }

    async postImport(transactionHandle: any, settings: ImporterSettings, observer: Observer<ImportLogMessage>): Promise<void> {
        // post-import operations, e.g. refreshing indices, updating aliases, etc.
        log.info(`Post-import operations for catalog: ${this.id}`);
    }

    async serialize(input: object): Promise<object> {
        // serialize input object for DB storage
        return input
    }

    transform(rows: object[]): object[] {
        throw new Error('Method not implemented.');
    }

    deduplicate(datasets: object[]): object[] {
        throw new Error('Method not implemented.');
    }

    getDatabase(): DatabaseUtils {
        return this.database;
    }

    getElastic(): ElasticsearchUtils {
        return this.elastic;
    }

    deleteStaleRecords(sourceId: string): Promise<void> {
        throw new Error('Method not implemented.');
    }

    deleteAllRecordsForCatalog(sourceId: string): Promise<void> {
        throw new Error('Method not implemented.');
    }
}