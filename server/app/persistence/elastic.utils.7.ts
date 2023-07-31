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

import { BulkResponse, ElasticsearchUtils, EsOperation } from './elastic.utils';
import { Client } from 'elasticsearch7';
import { Index } from '@shared/index.model';
import { IndexConfiguration, IndexSettings } from './elastic.setting';
import { ProfileFactoryLoader } from '../profiles/profile.factory.loader';
import { Summary } from '../model/summary';

let log = require('log4js').getLogger(__filename);

export class ElasticsearchUtils7 extends ElasticsearchUtils {

    protected client: Client;

    constructor(config: IndexConfiguration, summary: Summary) {
        super(config);
        this.summary = summary;

        this.client = new Client({
            node: config.url,
            auth: {
                username: config.user,
                password: config.password
            },
            requestTimeout: 30000
        });
        this._bulkOperationChunks = [];
        this.indexName = config.prefix + config.index;

        let profile = ProfileFactoryLoader.get();
        this.deduplicationUtils = profile.getDeduplicationUtils(this, this.summary);
        this.elasticQueries = profile.getElasticQueries();
    }

    async cloneIndex(mapping, settings: IndexSettings) {
        // find newest existing index
        let existingIndices = await this.getIndicesFromBasename(this.indexName);
        let oldIndexName = existingIndices.map(index => index.name).sort().pop();
        // first prepare index
        await this.prepareIndex(mapping, settings);
        await this.client.cluster.health({wait_for_status: 'yellow'});
        // then reindex, i.e. copy documents, from last existing to new
        await this.client.reindex({
            wait_for_completion: true,
            refresh: true,
            body: {
                source: {
                    index: oldIndexName
                },
                dest: {
                    index: this.indexName
                }
            }
        });
    }

    async prepareIndex(mappings, settings: IndexSettings, openIfPresent=false) {
        // if (this.config.includeTimestamp) {
        //     this.indexName += '_' + this.getTimeStamp(new Date());
        // }
        return await this.prepareIndexWithName(this.indexName, mappings, settings, openIfPresent);
    }

    async prepareIndexWithName(indexName: string, mappings, settings: IndexSettings, openIfPresent=false) {
        indexName = this.addPrefixIfNotExists(indexName) as string;
        let isPresent = await this.isIndexPresent(indexName);
        settings = {
            ...settings,
            number_of_shards: this.config.numberOfShards,
            number_of_replicas: this.config.numberOfReplicas,
            max_shingle_diff: 6,
            max_ngram_diff: 7
        }
        if (!openIfPresent || !isPresent) {
            try {
                return await this.client.indices.create({
                    index: indexName,
                    wait_for_active_shards: '1',
                    body: {
                        mappings,
                        settings
                    }
                });
            }
            catch(err) {
                let message = 'Error occurred creating index ' + indexName;
                if (err.message.indexOf('index_already_exists_exception') !== -1) {
                    message = 'Index ' + indexName + ' not created, since it already exists.';
                }
                this.handleError(message, err);
                return message;
            }
        }
        else {
            try {
                return await this.client.indices.open({
                    index: indexName,
                    wait_for_active_shards: '1'
                });
            }
            catch (err) {
                let message = 'Error occurred opening existing index ' + indexName;
                this.handleError(message, err);
                return message;
            }
        }
    }

    async finishIndex(closeIndex: boolean = true) {
        if (this.config.dryRun) {
            log.debug('Skipping finalisation of index for dry run.');
            return;
        }

        try {
            await this.client.cluster.health({ wait_for_status: 'yellow' });
            await this.sendBulkOperations(false);
            if (closeIndex) {
                // await this.deleteOldIndices(this.config.index, this.indexName);
                // if (this.config.addAlias) {
                //     await this.addAlias(this.indexName, this.config.alias);
                // }
                // await this.deduplicationUtils.deduplicate();
                await this.client.close();
            }
            log.info('Successfully added data into index: ' + this.indexName);
        }
        catch(err) {
            log.error('Error finishing index', err);
        }
    }

    async addAlias(index: string, alias: string): Promise<any> {
        index = this.addPrefixIfNotExists(index) as string;
        return await this.client.indices.putAlias({
            index,
            name: alias
        });
    }

    async removeAlias(index: string, alias: string): Promise<any> {
        index = this.addPrefixIfNotExists(index) as string;
        return await this.client.indices.deleteAlias({
            index,
            name: alias
        });
    }

    async deleteOldIndices(indexBaseName: string, ignoreIndexName: string) {
        indexBaseName = this.addPrefixIfNotExists(indexBaseName) as string;
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
        baseName = this.addPrefixIfNotExists(baseName) as string;
        let { body: response } = await this.client.cat.indices({
            h: ['index', 'docs.count', 'health', 'status'],
            format: 'json'
        });
        return response
            .filter(json => {
                // the index name must consist of the base name + the date string which is
                // 18 characters long
                // in case we want to get all indices just request with an empty baseName
                return baseName === this.config.prefix || (json.index.startsWith(baseName) && json.index.length === baseName.length + ElasticsearchUtils.LENGTH_OF_TIMESTAMP);
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

    async bulk(bulkOperations: any[], closeAfterBulk: boolean): Promise<BulkResponse> {
        try {
            let { body: response } = await this.client.bulk({
                index: this.indexName,
                type: this.config.indexType || 'base',
                body: bulkOperations
            });
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
            log.debug('Bulk finished of #operations + #docs: ' + bulkOperations.length);
            return {
                queued: false,
                response: response
            };
        }
        catch (e) {
            if (closeAfterBulk) {
                this.client.close();
            }
            this.handleError('Error during bulk #operations + #docs: ' + bulkOperations.length, e);
        }
    }

    bulkWithIndexName(index: string, type, data, closeAfterBulk): Promise<BulkResponse> {
        index = this.addPrefixIfNotExists(index) as string;
        return new Promise((resolve, reject) => {
            try {
                this.client.bulk({
                    index,
                    type: type,
                    body: data
                })
                .then(({ body: response }) => {
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

    async addOperationChunksToBulk(boxedOperations: EsOperation[]): Promise<BulkResponse> {
        let operationChunk = [];
        for (let { operation, _id, document } of boxedOperations) {
            operationChunk.push({ [operation]: { _id } });
            switch (operation) {
                case 'index':
                    operationChunk.push(document);
                    break;
                case 'create':
                    operationChunk.push(document);
                    break;
                case 'update':
                    operationChunk.push({ doc: document });
                    break;
                case 'delete':
                    // delete expects no document
                    break;
            }
        }
        this._bulkOperationChunks.push(operationChunk);

        if (this._bulkOperationChunks.length >= ElasticsearchUtils.maxBulkSize) {
            return this.sendBulkOperations();
        } else {
            return new Promise(resolve => resolve({
                queued: true
            }));
        }
    }

    async addDocToBulk(document, id, maxBulkSize=ElasticsearchUtils.maxBulkSize): Promise<BulkResponse> {
        return this.addOperationChunksToBulk([{ operation: 'index', _id: id, document }]);
    }

    sendBulkOperations(closeAfterBulk?: boolean): Promise<BulkResponse> {
        if (this._bulkOperationChunks.length > 0) {
            let bulkOperations = this._bulkOperationChunks.flat(1);
            log.debug('Sending BULK message with ' + this._bulkOperationChunks.length + ' operation chunks to ' + this.indexName);
            let promise = this.bulk(bulkOperations, closeAfterBulk);
            this._bulkOperationChunks = [];
            return promise;
        }
        return new Promise(resolve => resolve({
            queued: true
        }));
    }

    async getStoredData(ids) {
        if (ids.length < 1) return [];

        const aliasExists = await this.client.indices.existsAlias({
            name: this.config.alias
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
                let result: any = await this.client.msearch({
                    index: this.config.alias,
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
        this.summary.elasticErrors?.push(message);
        log.error(message, error);
    }

    async deleteIndex(indicesToDelete: string | string[]): Promise<any> {
        if (indicesToDelete) {
            indicesToDelete = this.addPrefixIfNotExists(indicesToDelete);
            log.debug('Deleting indices: ' + indicesToDelete);
            return await this.client.indices.delete({
                index: indicesToDelete
            });
        }
    }

    async search(index: string | string[], body?: object, size?: number): Promise<{ hits: any }> {
        index = this.addPrefixIfNotExists(index);
        let { body: response } = await this.client.search({
            index,
            body,
            size
        });
        return { hits: [], ...response };
    }

    get(index: string, id: string): Promise<any> {
        throw new Error('Method not implemented.');
    }

    async getHistory(body: object, size = 30): Promise<{ history: any }> {
        let { body: response } = await this.client.search({
            index: this.indexName,
            body,
            size
        });
        return { history: response.hits.hits.map(entry => entry._source) };
    }

    async getAccessUrls(after_key): Promise<any> {
        let { body: response }: any = await this.client.search({
            index: this.config.prefix + '*',
            body: this.elasticQueries.getAccessUrls(after_key),
            size: 0
        });
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
        let { body: response }: any = await this.client.search({
            index: this.config.alias,
            body: this.elasticQueries.getFacetsByAttribution(),
            size: 0
        });
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
        index = this.addPrefixIfNotExists(index) as string;
        return await this.client.indices.getSettings({ index });
    }

    async getIndexMapping(index: string): Promise<any>{
        index = this.addPrefixIfNotExists(index) as string;
        return await this.client.indices.getMapping({ index });
    }

    async getAllEntries(index: string): Promise<any>{
        index = this.addPrefixIfNotExists(index) as string;
        return new Promise((resolve) => {
            let results = [];
            let client = this.client;

            this.client.search({
                index,
                scroll: '5s',
                body: {
                    query: {
                        "match_all": {}
                    }
                }
            }).then(function getMoreUntilDone({ body: response }) {
                response.hits.hits.forEach(function (hit) {
                    results.push(hit);
                });

                if (response.hits.total !== results.length) {
                    client.scroll({
                        scroll_id: response._scroll_id,
                        scroll: '5s'
                    }).then(getMoreUntilDone);
                } else {
                    resolve(results);
                }
            });
        });
    }

    async isIndexPresent(index: string) {
        index = this.addPrefixIfNotExists(index) as string;
        try {
            let { body: response } = await this.client.cat.indices({
                h: ['index'],
                format: 'json'
            })
            return response.some(json => index === json.index);
        }
        catch(e) {
            this.handleError('Error while checking existence of index: ' + index, e);
        }
    }

    async index(index: string, document: object) {
        index = this.addPrefixIfNotExists(index) as string;
        await this.client.index({ index, type: 'base', body: document });
    }

    async deleteByQuery(days: number) {
        await this.client.deleteByQuery({
            index: this.indexName,
            body: {
                query: {
                    range: {
                        timestamp: {
                            lt: "now-" + days + "d/d"
                        }
                    }
                }
            }
        });
    }

    async deleteDocument(index: string, id: string) {
        index = this.addPrefixIfNotExists(index) as string;
        await this.client.delete({
            index,
            type: 'base',
            id
        });
    }

    async ping() {
        let { body: response } = await this.client.ping();
        return response;
    }
}
