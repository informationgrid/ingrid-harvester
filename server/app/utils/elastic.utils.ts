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

import { DeduplicateUtils } from './deduplicate.utils';
import { Client as Client6 } from 'elasticsearch6';
import { Client as Client7 } from 'elasticsearch7';
import { Client as Client8 } from 'elasticsearch8';
import { ElasticQueries } from './elastic.queries';
import { ElasticSettings } from './elastic.setting';
import { Index } from '@shared/index.model';
import { ProfileFactoryLoader } from '../profiles/profile.factory.loader';
import { Summary } from '../model/summary';

const log = require('log4js').getLogger(__filename);

export interface BulkResponse {
    queued: boolean;
    response?: any;
}

export class ElasticSearchUtils {

    private client: Client6 | Client7 | Client8;
    private static readonly LENGTH_OF_TIMESTAMP = 18;
    private settings: ElasticSettings;
    private summary: Summary;

    public static maxBulkSize: number = 50;
    public deduplicationUtils: DeduplicateUtils;
    public elasticQueries: ElasticQueries;
    public indexName: string;
    public _bulkData: any[];

    constructor(settings: ElasticSettings, summary: Summary) {
        this.settings = settings;
        this.summary = summary;

        // the elasticsearch client for accessing the cluster
        let clientSettings = {
            node: settings.elasticSearchUrl,
            auth: {
                username: settings.elasticSearchUser,
                password: settings.elasticSearchPassword
            },
            requestTimeout: 30000
        };
        this.client = this.getClient(clientSettings);
        this._bulkData = [];
        this.indexName = settings.index;

        let profile = ProfileFactoryLoader.get();
        this.deduplicationUtils = profile.getDeduplicationUtils(this, settings, this.summary);
        this.elasticQueries = profile.getElasticQueries();
    }

    private getClient(clientSettings): Client6 | Client7 | Client8 {
        switch (this.settings.elasticSearchVersion) {
            case '6': return new Client6(clientSettings);
            case '7': return new Client7(clientSettings);
            case '8': return new Client8(clientSettings);
            default:
                throw new Error(`Only ES versions 6, 7, and 8 are supported; [${this.settings.elasticSearchVersion}] was specified`);
        }
    }

    /**
     *
     * @param mapping
     * @param {object} settings
     */
    async cloneIndex(mapping: object, settings: object): Promise<void> {
        // find newest existing index
        let existingIndices = await this.getIndicesFromBasename(this.indexName);
        let oldIndexName = existingIndices.map(index => index.name).sort().pop();
        // first prepare index
        await this.prepareIndex(mapping, settings);
        await (<{ health: Function }>this.client.cluster).health({wait_for_status: 'yellow'});
        // then reindex, i.e. copy documents, from last existing to new
        await (<{ reindex: Function }>this.client).reindex({
            wait_for_completion: true,
            refresh: true,
            ...this._pack({
                source: {
                    index: oldIndexName
                },
                dest: {
                    index: this.indexName
                }
            })
        });
    }

    /**
     *
     * @param mappings
     * @param {object} settings
     * @param {boolean} openIfPresent
     */
    async prepareIndex(mappings: object, settings: object, openIfPresent: boolean = false) {
        if (this.settings.includeTimestamp) {
            this.indexName += '_' + this.getTimeStamp(new Date());
        }
        return await this.prepareIndexWithName(this.indexName, mappings, settings, openIfPresent);
    }

    /**
     *
     * @param {string} index
     * @param {object} mappings
     * @param {object} settings
     * @param {boolean} openIfPresent
     */
    async prepareIndexWithName(index: string, mappings: object, settings: object, openIfPresent: boolean = false) {
        let isPresent = await this.isIndexPresent(this.indexName);
        settings = {
            ...settings,
            number_of_shards: this.settings.numberOfShards,
            number_of_replicas: this.settings.numberOfReplicas,
            max_shingle_diff: 6,
            max_ngram_diff: 7
        }
        if (!openIfPresent || !isPresent) {
            try {
                return await (<{ create: Function }>this.client.indices).create({
                    index,
                    wait_for_active_shards: this._quote(1),
                    ...this._pack({
                        mappings,
                        settings
                    })
                });
            }
            catch(err) {
                let message = 'Error occurred creating index ' + index;
                if (err.message.indexOf('index_already_exists_exception') !== -1) {
                    message = 'Index ' + index + ' not created, since it already exists.';
                }
                this.handleError(message, err);
                return message;
            }
        }
        else {
            try {
                return await (<{ open: Function }>this.client.indices).open({
                    index,
                    wait_for_active_shards: this._quote(1)
                });
            }
            catch (err) {
                let message = 'Error occurred opening existing index ' + index;
                this.handleError(message, err);
                return message;
            }
        }
    }

    async finishIndex(closeIndex: boolean = true) {
        if (this.settings.dryRun) {
            log.debug('Skipping finalisation of index for dry run.');
            return;
        }

        try {
            await (<{ health: Function }>this.client.cluster).health({wait_for_status: 'yellow'});
            await this.sendBulkData(false);
            if (closeIndex) {
                await this.deleteOldIndices(this.settings.index, this.indexName);
                if (this.settings.addAlias) {
                    await this.addAlias(this.indexName, this.settings.alias);
                }
                await this.deduplicationUtils.deduplicate();
                await this.client.close();
            }
            log.info('Successfully added data into index: ' + this.indexName);
        }
        catch(err) {
            log.error('Error finishing index', err);
        }
    }

    /**
     * Add the specified alias to an index.
     *
     * @param {string} index
     * @param {string} alias
     */
    async addAlias(index: string, alias: string): Promise<any> {
        return await (<{ putAlias: Function }>this.client.indices).putAlias({
            index,
            name: alias
        });
    }

    /**
     * Remove the specified alias from an index.
     *
     * @param {string} index
     * @param {string} alias
     */
    async removeAlias(index: string, alias: string): Promise<any> {
        return await (<{ deleteAlias: Function }>this.client.indices).deleteAlias({
            index,
            name: alias
        });
    }

    /**
     * Delete all indices starting with indexBaseName but not indexName .
     *
     * @param {string} indexBaseName
     * @param {string} ignoreIndexName
     */
    async deleteOldIndices(indexBaseName, ignoreIndexName) {
        //  match index to be deleted with indexBaseName_timestamp!
        //  otherwise other indices with same prefix will be removed
        try {
            let indices = await this.getIndicesFromBasename(indexBaseName);
            let indicesToDelete = indices.filter(index => index.name !== ignoreIndexName);
            if (indicesToDelete.length > 0) {
                return this.deleteIndex(indicesToDelete.map(i => i.name));
            }
        }
        catch(err) {
            this.handleError('Error occurred getting index names', err);
        }
    }

    async getIndicesFromBasename(baseName: string): Promise<Index[]> {
        let response = await this._unpack((<{ indices: Function }>this.client.cat).indices({
            h: ['index', 'docs.count', 'health', 'status'],
            format: 'json'
        }));
        return response
            .filter(json => {
                // the index name must consist of the base name + the date string which is
                // 18 characters long
                // in case we want to get all indices just request with an empty baseName
                return baseName === '' || (json.index.startsWith(baseName) && json.index.length === baseName.length + ElasticSearchUtils.LENGTH_OF_TIMESTAMP);
            })
            .map(item => {
                return {
                    name: item.index,
                    numDocs: parseInt(item['docs.count']),
                    health: item.health,
                    status: item.status
                } as Index;
            });
    }

    /**
     * Index data in batches
     * @param {object} data
     * @param {boolean} closeAfterBulk
     */
    async bulk(data: object[], closeAfterBulk: boolean): Promise<BulkResponse> {
        try {
            let response = await this._unpack((<{ bulk: Function }>this.client).bulk({
                index: this.indexName,
                ...this._toggle({ type: this.settings.indexType || 'base' }),
                ...this._pack(data, 'operations')
            }));
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
            return {
                queued: false,
                response: response
            };
        }
        catch (e) {
            if (closeAfterBulk) {
                this.client.close();
            }
            this.handleError('Error during bulk indexing of #items: ' + data.length / 2, e);
        }
    }

    async bulkWithIndexName(index: string, type, data: object[], closeAfterBulk: boolean): Promise<BulkResponse> {
        return new Promise((resolve, reject) => {
            try {
                (<{ bulk: Function }>this.client).bulk({
                    index,
                    ...this._toggle({ type: this.settings.indexType || 'base' }),
                    ...this._pack(data, 'operations')
                })
                .then((body) => {
                    let response: any = this._unpack(body);
                    if (response.errors) {
                        response.items.forEach(item => {
                            let err = item.index.error;
                            if (err) {
                                this.handleError(`Error during indexing on index '${index}' for item.id '${item.index._id}': ${JSON.stringify(err)}`, err);
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
     * @param {number} maxBulkSize
     */
    async addDocToBulk(doc: any, id: string | number, maxBulkSize: number = ElasticSearchUtils.maxBulkSize): Promise<BulkResponse> {
        this._bulkData.push({
            index: {
                _id: id
            }
        });
        this._bulkData.push(doc);

        // this.deduplicationUtils._queueForDuplicateSearch(doc, id);

        // send data to elasticsearch if limit is reached
        // TODO: don't use document size but bytes instead
        await (<{ health: Function }>this.client.cluster).health({wait_for_status: 'yellow'});
        if (this._bulkData.length >= (maxBulkSize * 2)) {
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
     * @param {boolean} closeAfterBulk
     */
    sendBulkData(closeAfterBulk?: boolean): Promise<BulkResponse> {
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
    async getStoredData(ids): Promise<Array<any>> {
        if (ids.length < 1) return [];

        const aliasExists = await (<{ existsAlias: Function }>this.client.indices).existsAlias({
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
                let result: any = await (<{ msearch: Function }>this.client).msearch({
                    index: this.settings.alias,
                    ...this._pack(slice, 'searches')
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


    async deleteIndex(indicesToDelete: string | string[]): Promise<any> {
        if (indicesToDelete) {
            log.debug('Deleting indices: ' + indicesToDelete);
            return await (<{ delete: Function }>this.client.indices).delete({
                index: indicesToDelete
            });
        }
    }

    async search(index: string | string[], body?: object, size?: number): Promise<{ hits: any, aggregations?: any }> {
        let response: any = await this._unpack((<{ search: Function }>this.client).search({
            index,
            ...this._pack(body),
            size
        }));
        return response;
    }

    async getHistory(index: string, body: object): Promise<{ history: any }> {
        let response: any = await this._unpack((<{ search: Function }>this.client).search({
            index,
            ...this._pack(body),
            size: 30
        }));
        return { history: response.hits.hits.map(entry => entry._source) };
    }

    async getHistories(): Promise<any> {
        let response: any = await this._unpack((<{ search: Function }>this.client).search({
            index: 'mcloud_harvester_statistic',
            ...this._pack(this.elasticQueries.findHistories()),
            size: 1000
        }));
        return response.hits.hits.map(entry => entry._source);
    }

    async getAccessUrls(after_key: any): Promise<any> {
        let response: any = await this._unpack((<{ search: Function }>this.client).search({
            index: '',
            ...this._pack(this.elasticQueries.getAccessUrls(after_key)),
            size: 0
        }));
        return {
            after_key: response.aggregations.accessURL.after_key,
            buckets: response.aggregations.accessURL.buckets.map(entry => {
                return {
                    url: entry.key.accessURL,
                    attribution: entry.attribution.buckets.map(entry => {
                        return {name: entry.key, count: entry.doc_count}
                    })
                }
            })
        };
    }

    async getFacetsByAttribution(): Promise<any> {
        let response: any = await this._unpack((<{ search: Function }>this.client).search({
            index: this.settings.alias,
            ...this._pack(this.elasticQueries.getFacetsByAttribution()),
            size: 0
        }));
        return response.aggregations.attribution.buckets.map(entry =>
            ({
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
            })
        );
    }

    async getIndexSettings(index: string): Promise<any>{
        return await (<{ getSettings: Function }>this.client.indices).getSettings({ index });
    }

    async getIndexMapping(index: string): Promise<any>{
        return await (<{ getMapping: Function }>this.client.indices).getMapping({ index });
    }

    async getAllEntries(index: string): Promise<any>{
        return new Promise((resolve) => {
            let results = [];
            let client = this.client;

            (<{ search: Function }>this.client).search({
                index,
                scroll: '5s',
                ...this._pack({
                    query: {
                        "match_all": {}
                    }
                })
            }).then(function getMoreUntilDone(body) {
                let response = this.unpack(body);
                response.hits.hits.forEach(function (hit) {
                    results.push(hit);
                });

                if (response.hits.total !== results.length) {
                    (<{ scroll: Function }>client).scroll({
                        scroll_id: response._scroll_id,
                        scroll: '5s'
                    }).then(getMoreUntilDone);
                } else {
                    resolve(results);
                }
            });
        });
    }

    async isIndexPresent(index: string): Promise<boolean> {
        try {
            let response = await this._unpack((<{ indices: Function }>this.client.cat).indices({
                h: ['index'],
                format: 'json'
            }));
            return response.some(json => index === json.index);
        }
        catch(e) {
            this.handleError('Error while checking existence of index: ' + index, e);
        }
    }

    async index(index: string, document: object): Promise<void> {
        await (<{ index: Function }>this.client).index({
            index,
            ...this._toggle({ type: 'base' }),
            body: document
        });
    }

    async deleteByQuery(days: number): Promise<void> {
        await (<{ deleteByQuery: Function }>this.client).deleteByQuery({
            index: this.indexName,
            ...this._pack({
                query: {
                    range: {
                        timestamp: {
                            lt: "now-" + days + "d/d"
                        }
                    }
                }
            })
        });
    }

    async deleteDocument(index: string, id: string): Promise<void> {
        await (<{ delete: Function }>this.client).delete({
            index,
            ...this._toggle({ type: 'base' }),
            id
        });
    }

    async ping(): Promise<boolean> {
        return await this._unpack((<{ ping: Function }>this.client).ping());
    }

    async health(status: 'green' | 'yellow' | 'red' = 'yellow'): Promise<any> {
        return (<{ health: Function }>this.client.cluster).health({ wait_for_status: status });
    }

    async flush(body?: object): Promise<any> {
        return (<{ flush: Function }>this.client.indices).flush(body);
    };

    /**
     * Returns a new Timestamp string
     */
    // TODO replace this with a proper date format function instead of homebrew stuff?
    protected getTimeStamp(date) {
        let stamp = String(date.getFullYear());
        stamp += ('0' + (date.getMonth() + 1)).slice(-2);
        stamp += ('0' + date.getDate()).slice(-2);
        stamp += ('0' + date.getHours()).slice(-2);
        stamp += ('0' + date.getMinutes()).slice(-2);
        stamp += ('0' + date.getSeconds()).slice(-2);
        stamp += ('00' + date.getMilliseconds()).slice(-3);
        return stamp;
    }

    protected handleError(message: string, error: any) {
        this.summary.elasticErrors?.push(message);
        log.error(message, error);
    }

    /**
     * Packs the given object into a new object with property "body" for ES6, ES7.
     * This is needed for ES6 and ES7 API functions.
     * 
     * @param obj 
     * @param packForEs8 optional wrapper if using ES8
     * @returns the original object if using ES8; a body-wrapped object if using ES6 or ES7
     */
    private _pack(obj: object, packForEs8: string = '') {
        if (this.client instanceof Client6 || this.client instanceof Client7) {
            return { body: obj };
        }
        else if (packForEs8) {
            return { [packForEs8]: obj };
        }
        return obj;
    }

    /**
     * Unpacks property "body" from a given object for ES6, ES7.
     * This is needed for ES6 and ES7 API functions.
     * 
     * @param obj 
     * @returns the original object if using ES8; a body-wrapped object if using ES6 or ES7
     */
    private async _unpack(response: any) {
        await response;
        if (this.client instanceof Client6 || this.client instanceof Client7) {
            return response.body;
        }
        return response;
    }

    /**
     * "Enables" the given object for ES6, ES7.
     * 
     * @param obj 
     * @returns an empty object if using ES8; the original object if using ES6, ES7
     */
    private _toggle(obj: object) {
        if (this.client instanceof Client6 || this.client instanceof Client7) {
            return obj;
        }
        return {};
    }

    /**
     * Wraps a number in quotes for ES6, ES7.
     * 
     * @param n 
     * @returns the original number if using ES8; the number wrapped in quotes if using ES6, ES7
     */
    private _quote(n: number) {
        if (this.client instanceof Client6 || this.client instanceof Client7) {
            return `'${n}'`;
        }
        return n;
    }
}
