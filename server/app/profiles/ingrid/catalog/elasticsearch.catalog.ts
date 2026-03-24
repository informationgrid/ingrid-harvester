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
import { ElasticsearchCatalog } from '../../../catalog/elasticsearch/elasticsearch.catalog.js';
import type { ImporterSettings } from '../../../importer.settings.js';
import { ImportResult, type ImportLogMessage } from '../../../model/import.result.js';
import { ProfileFactoryLoader } from '../../../profiles/profile.factory.loader.js';
import { ConfigService } from '../../../services/config/ConfigService.js';
import { camelize } from '../../../utils/misc.utils.js';
import { INGRID_META_INDEX } from '../profile.factory.js';
import type { DeduplicationMetadata } from './deduplicationMetadata.js';

const log = log4js.getLogger(import.meta.filename);

export class IngridElasticsearchCatalog extends ElasticsearchCatalog {

    private deduplicationMetadata: Map<string, DeduplicationMetadata>;

    async import(transactionHandle: any, settings: ImporterSettings, observer: Observer<ImportLogMessage>): Promise<void> {
        // import data into Elasticsearch catalog
        log.info(`Importing data for transaction: ${transactionHandle}`);

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

    /**
     * For InGrid, prepareImport is used to gather all metadata from configured aliases that is used for interstellar deduplication.
     * 
     * @param transactionHandle 
     * @param settings 
     * @param observer 
     */
    async prepareImport(transactionHandle: any, settings: ImporterSettings, observer: Observer<ImportLogMessage>): Promise<void> {
        this.deduplicationMetadata = new Map<string, DeduplicationMetadata>();

        const aliases = (this.settings as ElasticsearchCatalogSettings).settings.dedupAliases;
        const total = await this.elastic.count(aliases);

        const scrollSearch = this.elastic.scroll<{ uuid: string, dataSourceName: string, modified: Date }>(aliases, ['uuid', 'dataSourceName', 'modified']);
        let processed = 0;
        for await (const hit of scrollSearch) {
            this.deduplicationMetadata.set(hit.uuid, {
                application: hit.dataSourceName,
                modified: hit.modified
            });
            observer.next(ImportResult.running(++processed, total, 'Existierende Datensätze sammeln'));
        }
    }

    async postImport(transactionHandle: any, settings: ImporterSettings, observer: Observer<ImportLogMessage>): Promise<void> {
        const iPlugClass = `de.ingrid.iplug.${settings.type.toLowerCase()}.dsc.${camelize(settings.type)}.DscSearchPlug`;
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
                    "iPlugClass": iPlugClass,
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
