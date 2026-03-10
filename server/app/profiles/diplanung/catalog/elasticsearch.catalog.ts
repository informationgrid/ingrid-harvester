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

import type { Observer } from 'rxjs';
import { ElasticsearchCatalog } from '../../../catalog/elasticsearch/elasticsearch.catalog.js';
import type { ImporterSettings } from '../../../importer.settings.js';
import type { ImportLogMessage } from '../../../model/import.result.js';
import { ProfileFactoryLoader } from '../../../profiles/profile.factory.loader.js';


export class DiplanungElasticsearchCatalog extends ElasticsearchCatalog {

    async import(transactionHandle: any, settings: ImporterSettings, observer: Observer<ImportLogMessage>): Promise<void> {
        // import data into Elasticsearch catalog
        console.log(`Importing data for transaction: ${transactionHandle}`);

        // const index = (this.settings as ElasticsearchCatalogSettings).settings.index;

        const aggregator = ProfileFactoryLoader.get().getPostgresAggregator(this.settings);

        // TODO split this into
        // 1) bucket fetching (put into abstract Catalog)
        // 2) transformation, coupling, deduplication (abstract method/s, handle in profile-specific catalogs)
        // 3) push to target (here, ES)
        // see below @ "streamBuckets" for a sketch
        await this.getDatabase().pushToElasticsearch(this.getElastic(), transactionHandle, observer, aggregator);

        // streamBuckets needs to accept callbacks for transformation (e.g. coupling), deduplication, and pushing to target
        // await this.getDatabase().streamBuckets(
        //     transactionHandle,
        //     (bucket) => this.deduplicate(bucket),
        //     (bucket) => this.transform(bucket),
        //     (bucket) => this.push(bucket, index)
        // );
    }

    async prepareImport(transactionHandle: any, settings: ImporterSettings, observer: Observer<ImportLogMessage>): Promise<void> {
        // no preparation needed
    }

    async postImport(transactionHandle: any, settings: ImporterSettings, observer: Observer<ImportLogMessage>): Promise<void> {
        // no aftercare needed
    }
}
