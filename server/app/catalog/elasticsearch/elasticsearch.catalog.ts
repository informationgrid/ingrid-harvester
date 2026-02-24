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

import type { ImporterSettings } from 'importer.settings.js';
import type { Summary } from '../../model/summary.js';
import type { DatabaseUtils } from '../../persistence/database.utils.js';
import { ElasticsearchFactory } from '../../persistence/elastic.factory.js';
import type { ElasticsearchUtils } from '../../persistence/elastic.utils.js';
import { ConfigService } from '../../services/config/ConfigService.js';
import { Catalog, type CatalogSettings } from '../catalog.factory.js';
import { ElasticsearchCatalogSummary } from './elasticsearch.catalog-summary.js';

export type ElasticsearchCatalogSettings = CatalogSettings & {
    settings: {
        index: string,
        alias: string,
    }
}

export abstract class ElasticsearchCatalog extends Catalog<object> {

    readonly id: string = 'elastic-catalog';
    readonly type: string = 'elasticsearch';

    protected readonly catalogSummary = new ElasticsearchCatalogSummary();

    private readonly elastic: ElasticsearchUtils;

    constructor(catalogSettings: ElasticsearchCatalogSettings, summary: Summary) {
        super(catalogSettings, summary);
        this.elastic = ElasticsearchFactory.getElasticUtils(ConfigService.getGeneralSettings().elasticsearch, summary);
    }

    // async import(transactionHandle: Date): Promise<void> {
    async import(transactionHandle: any, settings: ImporterSettings): Promise<void> {
        // import data into Elasticsearch catalog
        console.log(`Importing data for transaction: ${transactionHandle}`);
        
        // TODO split this into
        // 1) bucket fetching (put into abstract Catalog)
        // 2) transformation, coupling, deduplication (abstract method/s, handle in profile-specific catalogs)
        // 3) push to target (here, ES)
        await this.database.pushToElastic3ReturnOfTheJedi(this.elastic, transactionHandle);
    }

    async postImport(transactionHandle: any, settings: ImporterSettings): Promise<void> {
        // post-import operations, e.g. refreshing indices, updating aliases, etc.
        console.log(`Post-import operations for catalog: ${this.id}`);
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
}