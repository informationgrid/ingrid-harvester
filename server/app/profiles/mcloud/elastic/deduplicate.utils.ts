/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
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

import { DeduplicateUtils as AbstractDeduplicateUtils } from '../../../persistence/deduplicate.utils';
import { ElasticsearchUtils } from '../../../persistence/elastic.utils';
import { Summary } from '../../../model/summary';

const log = require('log4js').getLogger(__filename);


export class DeduplicateUtils extends AbstractDeduplicateUtils {

    constructor(elasticUtils: ElasticsearchUtils, summary: Summary) {
        super(elasticUtils, summary);
    }

    // FIXME: deduplication must work differently when import is not started for all harvesters
    async deduplicate() {
        await this._deduplicateByTitle();
        // await this._deduplicateUsingQuery();
    }

    // FIXME: deduplication must work differently when import is not started for all harvesters
    async _deduplicateByTitle() {

        // By default elasticsearch limits the count of aggregates to 10. Ask it
        // to return a lot more results!
        try {
            let response = await this.elastic.search(
                this.elastic.config.alias,
                this.queries.findSameTitle(),
                50
            );

            let count = 0;
            log.debug(`Count of buckets for deduplication aggregates query: ${response.aggregations.duplicates.buckets.length}`);
            response.aggregations.duplicates.buckets.forEach(bucket => {
                /*
                 * We asked the query to sort hits by modified dates. Newer hits are
                 * towards the beginning.
                 */
                try {
                    let hits = bucket.duplicates.hits.hits;

                    for (let i = 1; i < hits.length; i++) {
                        for (let j = 0; j < i; j++) {
                            let hit0 = hits[j];
                            let hit1 = hits[i];

                            // collect URLs from hits we want to compare
                            let urlsFromHit = [];
                            let urlsFromOtherHit = [];
                            hit0._source.distribution.forEach(dist => urlsFromHit.push(dist.accessURL));
                            hit1._source.distribution.forEach(dist => urlsFromOtherHit.push(dist.accessURL));

                            // only if all URLs are the same in both hits, we expect them to be equal AND have the same length
                            let remove =
                                urlsFromHit.length === urlsFromOtherHit.length
                                && urlsFromHit.every(url => urlsFromOtherHit.includes(url));

                            // Also Remove if both results have the same ID
                            remove = remove || (hit0._id && hit1._id && (hit0._id === hit1._id));

                            if (remove) {
                                let deleted = `Item to delete -> ID: '${hit1._id}', Title: '${hit1._source.title}', Index: '${hit1._index}'`;
                                let retained = `Item to retain -> ID: '${hit0._id}', Title: '${hit0._source.title}', Index: '${hit0._index}'`;
                                log.warn(`Duplicate item found and will be deleted.\n        ${deleted}\n        ${retained}`);
                                this.elastic._bulkData.push({
                                    delete: {
                                        _index: hit1._index,
                                        _type: hit1._type,
                                        _id: hit1._id
                                    }
                                });
                                count++;
                                break; // If we already deleted hit1 we don't have to compare it with any other hits.
                            }
                        }
                    }
                    return count;
                } catch (err) {
                    this.handleError(`Error deduplicating hits for URL ${bucket.key}`, err);
                }
            });
            log.info(`${count} duplicates found using the aggregates query will be deleted from index '${this.elastic.indexName}'.`);
        } catch (err) {
            this.handleError('Error processing results of aggregate query for duplicates', err);
        }
        await this.elastic.sendBulkData(false);

        // TODO: send flush request to immediately remove documents from index
        try {
            await this.elastic.flush();
        } catch (e) {
            log.error('Error occurred during flush', e);
        }

        log.debug(`Finished deleting duplicates found using the duplicates query in index ${this.elastic.indexName}`);
    }
}
