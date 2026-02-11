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

import { ElasticsearchCatalog } from '../../../catalog/elasticsearch/elasticsearch.catalog.js';
import type { ImporterSettings } from '../../../importer.settings.js';
import { ProfileFactoryLoader } from '../../../profiles/profile.factory.loader.js';
import { ConfigService } from '../../../services/config/ConfigService.js';
import { INGRID_META_INDEX } from '../profile.factory.js';


export class IngridElasticsearchCatalog extends ElasticsearchCatalog {

    async import(transactionHandle: any): Promise<void> {
        // import data into Elasticsearch catalog
        console.log(`Importing data for transaction: ${transactionHandle}`);

        // const index = (this.settings as ElasticsearchCatalogSettings).settings.index;

        const aggregator = ProfileFactoryLoader.get().getPostgresAggregator(this.settings);

        // TODO split this into
        // 1) bucket fetching (put into abstract Catalog)
        // 2) transformation, coupling, deduplication (abstract method/s, handle in profile-specific catalogs)
        // 3) push to target (here, ES)
        // see below @ "streamBuckets" for a sketch
        await this.getDatabase().pushToElastic3ReturnOfTheJedi(this.getElastic(), transactionHandle, aggregator);

        // streamBuckets needs to accept callbacks for transformation (e.g. coupling), deduplication, and pushing to target
        // await this.getDatabase().streamBuckets(
        //     transactionHandle,
        //     (bucket) => this.deduplicate(bucket),
        //     (bucket) => this.transform(bucket),
        //     (bucket) => this.push(bucket, index)
        // );
    }

    async prepareImport(transactionHandle: any, settings: ImporterSettings): Promise<void> {
        // no preparation needed
    }

    async postImport(transactionHandle: any, settings: ImporterSettings): Promise<void> {
        const meta = await this.getElastic().search(INGRID_META_INDEX,
            {
                "query": {
                    "term": {
                        "plugId": {
                            "value": settings.iPlugId,
                        }
                    }
                }
            }, false);
        if (meta.hits?.total?.value > 0) {
            let entry = meta.hits?.hits[0]._source;

            entry.lastIndexed = new Date(Date.now()).toISOString();
            entry.plugdescription.dataSourceName = settings.dataSourceName;
            entry.plugdescription.provider = settings.provider?.split(",")?.map(p => p.trim());
            entry.plugdescription.dataType = settings.datatype?.split(",")?.map(d => d.trim());
            entry.plugdescription.partner = settings.partner?.split(",")?.map(p => p.trim());

            await this.getElastic().update(INGRID_META_INDEX, meta.hits?.hits[0]._id, entry, false);
        }
        else {
            let { prefix, index } = ConfigService.getGeneralSettings().elasticsearch;
            let indexId = (prefix ?? '') + settings.catalogId;
            let entry = {
                "plugId": settings.iPlugId,
                "indexId": indexId,
                "iPlugName": "Harvester",
                "lastIndexed": new Date(Date.now()).toISOString(),
                "linkedIndex": indexId,
                "plugdescription": {
                    "dataSourceName": settings.dataSourceName,
                    "provider": settings.provider?.split(",")?.map(p => p.trim()),
                    "dataType": settings.datatype?.split(",")?.map(d => d.trim()),
                    "partner": settings.partner?.split(",")?.map(p => p.trim()),
                    "ranking": [
                        "score"
                    ],
                    "iPlugClass": "de.ingrid.iplug.csw.dsc.CswDscSearchPlug",
                    "fields": [],
                    "proxyServiceUrl": settings.iPlugId,
                    "useRemoteElasticsearch": true
                },
                "active": false
            }
            await this.getElastic().index(INGRID_META_INDEX, entry, false);
        }
    }
}
