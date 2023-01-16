/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2022 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

import {Summary} from '../model/summary';
import {ElasticSettings} from './elastic.setting';
import {ImporterSettings} from '../importer.settings';
import {ElasticSearchUtils} from './elastic.utils';
import {ElasticQueries} from './elastic.queries';

let log = require('log4js').getLogger(__filename);


export class DeduplicateUtils {

    /*duplicateStaging: {
        id: string,
        modified: Date,
        title: string,
        query: any
    }[];*/
    deduplicationIndices: string[];

    settings: ElasticSettings & ImporterSettings;
    summary: Summary;

    client: any;
    private elastic: ElasticSearchUtils;


    constructor(elasticUtils: ElasticSearchUtils, settings, summary) {
        this.summary = summary;
        this.elastic = elasticUtils;
        this.client = elasticUtils.client;
        this.settings = settings;
        // this.duplicateStaging = [];
    }

    // FIXME: deduplication must work differently when import is not started for all harvesters
    async deduplicate() {
        await this._deduplicateByTitle();
        // await this._deduplicateUsingQuery();
    }

    // FIXME: deduplication must work differently when import is not started for all harvesters
    /*async _deduplicateUsingQuery() {
        log.debug(`Looking for duplicates for items in index '${this.elastic.indexName}`);
        // TODO: make sure the index was refreshed to get the updated results (e.g. previous deletion of duplicated items)

        // Send data in chunks. Don't send too much at once.
        let maxSize = 5;
        let count = 0;
        for (let i = 0; i < this.duplicateStaging.length; i += maxSize) {
            let body = [];
            let end = Math.min(this.duplicateStaging.length, i + maxSize);

            let slice = this.duplicateStaging.slice(i, end);

            slice.forEach(item => {
                body.push({index: this.deduplicationIndices});
                body.push(item.query);
            });

            if (body.length < 1) return; // Don't send an empty query

            try {
                let results = await this.client.msearch({body: body});
                for (let j = 0; j < results.responses.length; j++) {
                    let response = results.responses[j];

                    if (response.error) {
                        this.handleError("Error in one of the search responses:", response.error);
                        continue;
                    }
                    if (!response.hits) continue;

                    response.hits.hits.forEach(hit => {
                        let item = slice[j];
                        let title = item.title;

                        let myDate = item.modified;
                        let hitDate = hit._source.modified;

                        // Make sure we aren't comparing apples to oranges.
                        // Convert to dates, if not already the case.
                        if (typeof myDate === 'string') myDate = new Date(Date.parse(myDate));
                        if (typeof hitDate === 'string') hitDate = new Date(Date.parse(hitDate));

                        if (typeof myDate === 'number') myDate = new Date(myDate);
                        if (typeof hitDate === 'number') hitDate = new Date(hitDate);

                        let q = {'delete': <any>{}};
                        let retained = '';
                        if (hitDate > myDate) {
                            // Hit is newer. Delete document from current index.
                            q.delete._index = this.elastic.indexName;
                            q.delete._type = this.settings.indexType;
                            q.delete._id = item.id;

                            retained = `Item to retain -> ID: '${hit._id}', Title: '${hit._source.title}', Index: '${hit._index};`;
                        } else { // Hit is older. Delete (h)it.
                            q.delete._index = hit._index;
                            q.delete._type = hit._type;
                            q.delete._id = hit._id;

                            title = hit._source.title;
                            retained = `Item to retain -> ID: '${item.id}', Title: '${title}', Index: '${this.elastic.indexName};`;
                        }

                        let deleted = `Item to delete -> ID: '${q.delete._id}', Title: '${title}', Index: '${q.delete._index}'`;

                        log.warn(`Duplicate item found and will be deleted.\n        ${deleted}\n        ${retained}`);
                        this.elastic._bulkData.push(q);
                        count++;
                    });
                }
            } catch (e) {
                this.handleError('Error during deduplication', e);
            }
        }

        // Perform bulk delete and resolve/reject the promise
        log.debug(`${count} duplicates found using the duplicates query will be deleted from the index '${this.elastic.indexName}'.`);
        await this.elastic.sendBulkData(false);
        log.debug(`Finished deleting duplicates found using the duplicates query in index ${this.elastic.indexName}`);
    }*/

    /**
     * Create a query for searching for duplicates of the given document and add
     * it to a queue to be executed later.
     *
     * @param doc document for which to search duplicates
     * @param id value to be assigned to the _id field of the document above
     */
    /*_queueForDuplicateSearch(doc, id) {
        // Don't search duplicates for invalid documents. Firstly, it is not
        // strictly necessarily and secondly, don't delete valid duplicates of
        // an invalid document
        if (doc.extras.metadata.isValid === false) return;

        let generatedId = doc.extras.generated_id;
        let modified = doc.modified;
        let title = doc.title;

        // Make sure there are no nulls
        if (!generatedId) generatedId = '';

        let urls = [];
        doc.distributions.forEach(dist => {
            if (dist.accessURL) {
                urls.push(dist.accessURL);
            }
        });

        const query = ElasticQueries.findSameIdTitleUrls(id, generatedId, urls, title);

        // if modified date does not exist then it should exist for another (do not compare doc to itself!)
        if (!modified || isNaN(modified)) {
            query.query.bool.must.push({
                exists: {field: "modified"}
            });
        } else {
            // otherwise the modified date must be different
            query.query.bool.must_not.push({
                term: {modified: modified}
            });
        }

        this.duplicateStaging.push({
            id: id,
            modified: modified,
            title: doc.title,
            query: query
        });
    }*/

    // FIXME: deduplication must work differently when import is not started for all harvesters
    async _deduplicateByTitle() {

        // By default elasticsearch limits the count of aggregates to 10. Ask it
        // to return a lot more results!
        try {
            let { body: response } = await this.client.search({
                index: [this.settings.alias],
                body: ElasticQueries.findSameTitle(),
                size: 50
            });

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
                            hit0._source.distributions.forEach(dist => urlsFromHit.push(dist.accessURL));
                            hit1._source.distributions.forEach(dist => urlsFromOtherHit.push(dist.accessURL));

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
            await this.client.indices.flush();
        } catch (e) {
            log.error('Error occurred during flush', e);
        }

        log.debug(`Finished deleting duplicates found using the duplicates query in index ${this.elastic.indexName}`);
    }

    private handleError(message: string, error: any) {
        this.summary.elasticErrors.push(message);
        log.error(message, error);
    }
}
