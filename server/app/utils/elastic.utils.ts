/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2021 wemove digital solutions GmbH
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
import {ImporterSettings} from '../importer.settings';
import {DeduplicateUtils} from './deduplicate.utils';
import {ElasticSettings} from './elastic.setting';
import {Index} from '@shared/index.model';
import {ElasticQueries} from "./elastic.queries";

let elasticsearch = require('elasticsearch'),
    log = require('log4js').getLogger(__filename);

require('url').URL;

export const DefaultElasticsearchSettings: ElasticSettings = {
    elasticSearchUrl: process.env.ELASTIC_URL || "http://localhost:9200",
    index: '',
    // alias: '',
    includeTimestamp: true,
};

export interface BulkResponse {
    queued: boolean;
    response?: any;
}

export class ElasticSearchUtils {
    public static maxBulkSize = 50;

    private static readonly LENGTH_OF_TIMESTAMP = 18;

    settings: ElasticSettings & ImporterSettings;
    client: any;
    _bulkData: any[];
    indexName: string;
    deduplicationAlias: string;

    summary: Summary;
    deduplicationUtils: DeduplicateUtils;

    constructor(settings, summary: Summary) {
        this.settings = settings;
        this.summary = summary;

        // the elasticsearch client for access the cluster
        const url = new URL(this.settings.elasticSearchUrl);
        this.client = new elasticsearch.Client({
            // log: 'trace',
            host: {
                host: url.hostname,
                port: url.port,
                protocol: url.protocol,
                auth: 'elastic:elastic',
            }
        });
        this._bulkData = [];
        this.indexName = this.settings.index;
        this.deduplicationAlias = this.settings.deduplicationAlias;

        this.deduplicationUtils = new DeduplicateUtils(this, this.settings, this.summary);
    }

    /**
     *
     * @param mapping
     * @param settings
     */
    prepareIndex(mapping, settings) {
        let body = {
            number_of_shards: this.settings.numberOfShards,
            number_of_replicas: this.settings.numberOfReplicas
        }
        return new Promise((resolve, reject) => {
            if (this.settings.includeTimestamp) this.indexName += '_' + this.getTimeStamp(new Date());
            this.client.indices.create({index: this.indexName, waitForActiveShards: '1', body: body})
                .then(() => this.addMapping(this.indexName, this.settings.indexType, mapping, settings, resolve, reject))
                .catch(err => {
                    let message = 'Error occurred creating index';
                    if (err.message.indexOf('index_already_exists_exception') !== -1) {
                        message = 'Index ' + this.indexName + ' not created, since it already exists.';
                    }
                    this.handleError(message, err);
                    reject(message);
                });
        });
    }

    /**
     *
     * @param mapping
     * @param settings
     */
    prepareIndexWithName(indexName: string, mapping, settings) {
        return new Promise((resolve, reject) => {
            this.client.indices.create({index: indexName, waitForActiveShards: '1', body: settings})
                .then(() => {
                    let type =  Object.keys(mapping)[0];
                    this.client.indices.putMapping({
                        index: indexName,
                        type: type,
                        body: mapping[type]
                    }, err => {
                        if (err) {
                            this.handleError('Error occurred adding mapping', err);
                            reject('Mapping error');
                        } else this.client.indices.open({index: indexName}, errOpen => {
                            if (errOpen) {
                                this.handleError('Error opening index', indexName);
                            }
                            resolve();
                        });
                    });
                })
                .catch(err => {
                    let message = 'Error occurred creating index';
                    if (err.message.indexOf('index_already_exists_exception') !== -1) {
                        message = 'Index ' + indexName + ' not created, since it already exists.';
                    }
                    this.handleError(message, err);
                    reject(message);
                });
        });
    }

    finishIndex() {
        if (this.settings.dryRun) {
            log.debug('Skipping finalisation of index for dry run.');
            return;
        }

        return this.client.cluster.health({waitForStatus: 'yellow'})
            .then(() => this.sendBulkData(false))
            .then(() => this.deleteOldIndices(this.settings.index, this.indexName))
            .then(() => {
                if (!this.settings.disable) {
                    return this.addAlias(this.indexName, this.settings.alias)
                }
            })
            .then(() => this.deduplicationUtils.deduplicate())
            .then(() => {
                this.client.close();
                log.info('Successfully added data into new index: ' + this.indexName);
            })
            .catch(err => log.error('Error finishing index', err));
    }

    /**
     * Add the specified alias to an index.
     *
     * @param {string} index
     * @param {string} alias
     */
    addAlias(index, alias) {
        return this.client.indices.putAlias({
            index: index,
            name: alias
        });
    }

    /**
     * Remove the specified alias from an index.
     *
     * @param {string} index
     * @param {string} alias
     */
    removeAlias(index, alias) {
        return this.client.indices.deleteAlias({
            index: index,
            name: alias
        });
    }


    /**
     * Delete all indices starting with indexBaseName but not indexName .
     *
     * @param {string} indexBaseName
     * @param {string} ignoreIndexName
     */
    deleteOldIndices(indexBaseName, ignoreIndexName) {

        //  match index to be deleted with indexBaseName_timestamp!
        //  otherwise other indices with same prefix will be removed
        return this.getIndicesFromBasename(indexBaseName)
            .then(indices => {

                let indicesToDelete = indices
                    .filter(index => index.name !== ignoreIndexName);

                if (indicesToDelete.length > 0) {
                    return this.deleteIndex(indicesToDelete.map(i => i.name));
                }
            }).catch(err => {
                this.handleError('Error occurred getting index names', err);
            });
    }

    getIndicesFromBasename(baseName: string): Promise<Index[]> {
        return this.client.cat.indices({
            h: ['index', 'docs.count', 'health', 'status'],
            format: 'json'
        }).then(body => {
            return body
                .filter(json => {
                    // the index name must consist of the base name + the date string which is
                    // 18 characters long
                    // in case we want to get all indices just request with an empty baseName
                    return baseName === '' || (json.index.startsWith(baseName) && json.index.length === baseName.length + ElasticSearchUtils.LENGTH_OF_TIMESTAMP);
                })
                .map(item => {
                    return {
                        name: item.index,
                        numDocs: item['docs.count'],
                        health: item.health,
                        status: item.status
                    } as Index;
                })
        });
    }

    /**
     * Add the specified mapping to an index and type.
     *
     * @param {string} index
     * @param {string} type
     * @param {object} mapping
     * @param {object} settings
     * @param callback
     * @param errorCallback
     */
    addMapping(index, type, mapping, settings, callback, errorCallback) {

        // set settings
        const handleSettings = () => {
            this.client.indices.putSettings({
                index: index,
                body: settings
            }, err => {
                if (err) {
                    this.handleError('Error occurred adding settings', err);
                    errorCallback(err);
                } else handleMapping(); //this.client.indices.open({ index: index });
            });
        };

        // set mapping
        const handleMapping = () => {
            this.client.indices.putMapping({
                index: index,
                type: type || 'base',
                body: mapping
            }, err => {
                if (err) {
                    this.handleError('Error occurred adding mapping', err);
                    errorCallback('Mapping error');
                } else this.client.indices.open({index: index}, errOpen => {
                    if (errOpen) {
                        this.handleError('Error opening index', errOpen);
                    }
                    callback();
                });
            });
        };

        // in order to update settings the index has to be closed
        const handleClose = () => {
            this.client.cluster.health({waitForStatus: 'yellow'})
                .then(() => this.client.indices.close({index: index}, handleSettings))
                .catch(() => {
                    log.error('Cluster state did not become yellow');
                    errorCallback('Elasticsearch cluster state did not become yellow');
                });
        };

        this.client.indices.create({index: index}, () => setTimeout(handleClose, 1000));
        // handleSettings();

    }

    /**
     * Index data in batches
     * @param {object} data
     * @param {boolean} closeAfterBulk
     */
    bulk(data, closeAfterBulk): Promise<BulkResponse> {
        return new Promise((resolve, reject) => {
            try {
                this.client.bulk({
                    index: this.indexName,
                    type: this.settings.indexType || 'base',
                    body: data
                })
                    .then((response) => {
                        if (response.errors) {
                            response.items.forEach(item => {
                                let err = item.index.error;
                                if (err) {
                                    this.handleError(`Error during indexing on index '${this.indexName}' for item.id '${item.index._id}': ${JSON.stringify(err)}`, err);
                                }
                            });
                        }
                        if (closeAfterBulk) {
                            log.debug('Closing client connection to Elasticsearch');
                            this.client.close();
                        }
                        log.debug('Bulk finished of data #items: ' + data.length / 2);
                        resolve({
                            queued: false,
                            response: response
                        });
                    })
                    .catch(err => {
                        this.handleError('Error occurred during bulk index of #items: ' + data.length / 2, err);
                        if (closeAfterBulk) {
                            this.client.close();
                        }
                        reject(err);
                    });
            } catch (e) {
                this.handleError('Error during bulk indexing of #items: ' + data.length / 2, e);
            }
        });
    }



    bulkWithIndexName(indexName, type, data, closeAfterBulk): Promise<BulkResponse> {
        return new Promise((resolve, reject) => {
            try {
                this.client.bulk({
                    index: indexName,
                    type: type,
                    body: data
                })
                    .then((response) => {
                        if (response.errors) {
                            response.items.forEach(item => {
                                let err = item.index.error;
                                if (err) {
                                    this.handleError(`Error during indexing on index '${indexName}' for item.id '${item.index._id}': ${JSON.stringify(err)}`, err);
                                }
                            });
                        }
                        if (closeAfterBulk) {
                            log.debug('Closing client connection to Elasticsearch');
                            this.client.close();
                        }
                        log.debug('Bulk finished of data #items: ' + data.length / 2);
                        resolve({
                            queued: false,
                            response: response
                        });
                    })
                    .catch(err => {
                        this.handleError('Error occurred during bulkWithIndexName index of #items: ' + data.length / 2, err);
                        if (closeAfterBulk) {
                            this.client.close();
                        }
                        reject(err);
                    });
            } catch (e) {
                this.handleError('Error during bulk indexing of #items: ' + data.length / 2, e);
            }
        });
    }

    /**
     * Add a document to the bulk array which will be sent to the elasticsearch node
     * if a certain limit {{maxBulkSize}} is reached.
     * @param doc
     * @param {string|number} id
     */
    addDocToBulk(doc, id): Promise<BulkResponse> {
        this._bulkData.push({
            index: {
                _id: id
            }
        });
        this._bulkData.push(doc);

        // this.deduplicationUtils._queueForDuplicateSearch(doc, id);

        // send data to elasticsearch if limit is reached
        // TODO: don't use document size but bytes instead
        if (this._bulkData.length >= (ElasticSearchUtils.maxBulkSize * 2)) {
            return this.sendBulkData();
        } else {
            return new Promise(resolve => resolve({
                queued: true
            }));
        }
    }

    /**
     * Send all collected bulk data if any.
     *
     * @param {boolean=} closeAfterBulk
     */
    sendBulkData(closeAfterBulk?): Promise<BulkResponse> {
        if (this._bulkData.length > 0) {
            log.debug('Sending BULK message with ' + (this._bulkData.length / 2) + ' items to index ' + this.indexName);
            let promise = this.bulk(this._bulkData, closeAfterBulk);
            this._bulkData = [];
            return promise;
        }
        return new Promise(resolve => resolve({
            queued: true
        }));
    }


    /**
     * Returns a new Timestamp string
     */
    getTimeStamp(date) {
        let stamp = String(date.getFullYear());
        stamp += ('0' + (date.getMonth() + 1)).slice(-2);
        stamp += ('0' + date.getDate()).slice(-2);
        stamp += ('0' + date.getHours()).slice(-2);
        stamp += ('0' + date.getMinutes()).slice(-2);
        stamp += ('0' + date.getSeconds()).slice(-2);
        stamp += ('00' + date.getMilliseconds()).slice(-3);
        return stamp;
    }

    /**
     * Searches the index for documents with the given ids and copies a set of the issued
     * date, modified date and harvested data from existing documents, if any exist. If multiple documents with
     * the same id are found, then the issued date is copied from the first hit
     * returned by elasticsearch. If no indexed document with the given id is
     * found, then null or undefined is returned.
     *
     * @param ids {Array} array of ids for which to look up the issued date
     * @returns {Promise<Array>}  array of issued dates (for found documents) or
     * nulls (for new documents) in the same order as the given ids
     */
    async getStoredData(ids) {
        if (ids.length < 1) return [];

        const aliasExists = await this.client.indices.existsAlias({
            name: this.settings.alias
        });
        if (!aliasExists) {
            return [];
        }

        let data = [];
        ids.forEach(id => {
            data.push({});
            data.push({
                query: {
                    term: {'_id': id}
                }
            });
        });

        // Send data in chunks. Don't send too much at once.
        let dates = [];
        let maxSize = 2 * 3; // !!! IMPORTANT: This number has to be even. That is the reason for the funny way to calculate it. That way one cannot forget to set an odd number when changing the value. !!!
        for (let i = 0; i < data.length; i += maxSize) {
            let end = Math.min(data.length, i + maxSize);

            let slice = data.slice(i, end);

            try {
                let result = await this.client.msearch({
                    index: this.settings.alias,
                    body: slice
                });

                if (result.responses) {
                    for (let j = 0; j < result.responses.length; j++) {
                        let response_id
                        let response = result.responses[j];
                        let issued;
                        let modified;
                        let dataset_modified;

                        if (response.error) {
                            this.handleError("Error in one of the search responses:", response.error);
                            continue;
                        }
                        try {
                            let firstHit = response.hits.hits[0];
                            response_id = firstHit._source.extras.generated_id
                            issued = firstHit._source.extras.metadata.issued;
                            modified = firstHit._source.extras.metadata.modified;
                            dataset_modified = firstHit._source.modified;
                        } catch (e) {
                            log.debug(`Did not find an existing issued date for dataset with id ${ids[i/2+j]}`);
                        }

                        dates.push({
                            id: response_id,
                            issued: issued,
                            modified: modified,
                            dataset_modified: dataset_modified
                        })

                    }
                } else {
                    log.debug('No result. Reponse after msearch', result);
                }
            } catch (e) {
                this.handleError('Error during search', e);
            }
        }

        return dates;
    }


    private handleError(message: string, error: any) {
        this.summary.elasticErrors.push(error.toString());
        log.error(message, error);
    }

    deleteIndex(indicesToDelete: string | string[]): Promise<any> {
        log.debug('Deleting indices: ' + indicesToDelete);
        return this.client.indices.delete({
            index: indicesToDelete
        });
    }

    search(indexName: string): Promise<any> {
        return this.client.search({index: indexName});
    }

    async getHistory(baseIndex: string): Promise<any> {
        let result = await this.client.search({
            index: ['mcloud_harvester_statistic'],
            body: ElasticQueries.findHistory(baseIndex),
            size: 30
        });
        return result.hits.hits.map(entry => entry._source);
    }

    async getHistories(): Promise<any> {
        let result = await this.client.search({
            index: ['mcloud_harvester_statistic'],
            body: ElasticQueries.findHistories(),
            size: 1000
        });
        return result.hits.hits.map(entry => entry._source);
    }

    async getAccessUrls(after_key): Promise<any> {
        let result = await this.client.search({
            index: this.indexName,
            body: ElasticQueries.getAccessUrls(after_key),
            size: 0
        });
        return {
            after_key: result.aggregations.accessURL.after_key,
            buckets: result.aggregations.accessURL.buckets.map(entry => {
                return {
                    url: entry.key.accessURL,
                    attribution: entry.attribution.buckets.map(entry => {
                        return {name: entry.key, count: entry.doc_count}
                    })
                }
            })
        };
    }

    async getUrlCheckHistory(): Promise<any> {
        let result = await this.client.search({
            index: ['url_check_history'],
            body: ElasticQueries.getUrlCheckHistory(),
            size: 30
        });
        return result.hits.hits.map(entry => entry._source);
    }

    async cleanUrlCheckHistory(days: number): Promise<any> {
        let result = await this.client.deleteByQuery({
            index: ['url_check_history'],
            body: {
                "query": {
                    "range": {
                        "timestamp": {
                            "lt":"now-"+days+"d/d"
                        }
                    }
                }
            }
        });
    }

    async getFacetsByAttribution(): Promise<any> {
        let result = await this.client.search({
            index: this.indexName,
            body: ElasticQueries.getFacetsByAttribution(),
            size: 0
        });
        return result.aggregations.attribution.buckets.map(entry => {
                return {
                    attribution: entry.key,
                    count: entry.doc_count,
                    is_valid:  entry.is_valid.buckets.map(entry => {
                        return {value: entry.key_as_string, count: entry.doc_count}
                    }),
                    spatial: entry.spatial.doc_count,
                    temporal: entry.temporal.doc_count,
                    license: entry.license.buckets.map(entry => {
                        return {name: entry.key, count: entry.doc_count}
                    }),
                    display_contact: entry.display_contact.buckets.map(entry => {
                        return {name: entry.key, count: entry.doc_count}
                    }),
                    format: entry.format.buckets.map(entry => {
                        return {name: entry.key, count: entry.doc_count}
                    }),
                    categories: entry.categories.buckets.map(entry => {
                        return {name: entry.key, count: entry.doc_count}
                    }),
                    accrual_periodicity: entry.accrual_periodicity.buckets.map(entry => {
                        return {name: entry.key, count: entry.doc_count}
                    }),
                    distributions: entry.distributions.buckets.map(entry => {
                        return {number: entry.key, count: entry.doc_count}
                    })
                }
            });
    }

    async getIndexCheckHistory(): Promise<any> {
        let result = await this.client.search({
            index: ['index_check_history'],
            body: ElasticQueries.getIndexCheckHistory(),
            size: 30
        });
        return result.hits.hits.map(entry => entry._source);
    }

    async getIndexSettings(indexName): Promise<any>{
        return await this.client.indices.getSettings({index: indexName})
    }

    async getIndexMapping(indexName): Promise<any>{
        return await this.client.indices.getMapping({index: indexName})
    }

    async getAllEntries(indexName): Promise<any>{
        return new Promise((resolve) => {
            let results = [];
            let client = this.client;

            this.client.search({
                index: indexName,
                scroll: '5s',
                body: {
                    query: {
                        "match_all": {}
                    }
                }
            }, function getMoreUntilDone(error, response) {
                response.hits.hits.forEach(function (hit) {
                    results.push(hit);
                });

                if (response.hits.total !== results.length) {
                    client.scroll({
                        scrollId: response._scroll_id,
                        scroll: '5s'
                    }, getMoreUntilDone);
                } else {
                    resolve(results);
                }
            });
        });
    }


}
