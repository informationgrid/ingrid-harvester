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

import log4js from 'log4js';
import { BulkResponse, ElasticsearchUtils, EsOperation } from './elastic.utils.js';
import { Client } from 'elasticsearch8';
import { Index } from '@shared/index.model.js';
import { IndexConfiguration, IndexSettings } from './elastic.setting.js';
import { ProfileFactoryLoader } from '../profiles/profile.factory.loader.js';
import { Summary } from '../model/summary.js';

const log = log4js.getLogger(import.meta.filename);

export class ElasticsearchUtils8 extends ElasticsearchUtils {

    protected client: Client;

    constructor(config: IndexConfiguration, summary: Summary) {
        super(config);
        this.summary = summary;

        // timeout is set to 0 as per recommendation (NodeJS ES 8.x uses UndiciConnection)
        // https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/timeout-best-practices.html
        this.client = new Client({
            node: config.url,
            auth: {
                username: config.user,
                password: config.password
            },
            requestTimeout: 0,
            tls: {
                rejectUnauthorized: config.rejectUnauthorized
            }
        });
        this._bulkOperationChunks = [];
        this.indexName = config.prefix + config.index;

        let profile = ProfileFactoryLoader.get();
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
            source: {
                index: oldIndexName
            },
            dest: {
                index: this.indexName
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
        // remove both of these variables and the connected environment variables once we have streamlined
        // the DiPlanung deployment using ConfigMaps
        if (this.config.numberOfShards) {
            settings.number_of_shards = this.config.numberOfShards;
        }
        if (this.config.numberOfReplicas) {
            settings.number_of_replicas = this.config.numberOfReplicas;
        }
        if (!openIfPresent || !isPresent) {
            try {
                return await this.client.indices.create({
                    index: indexName,
                    wait_for_active_shards: 1,
                    mappings,
                    settings
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
                    wait_for_active_shards: 1
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
            await this.sendBulkOperations();
            if (closeIndex) {
                // await this.deleteOldIndices(this.config.index, this.indexName);
                // if (this.config.addAlias) {
                //     await this.addAlias(this.indexName, this.config.alias);
                // }
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

    async listAliases(index: string): Promise<string[]> {
        index = this.addPrefixIfNotExists(index) as string;
        let response = await this.client.cat.aliases({
            format: 'json'
        });
        let aliases = response.filter(entry => entry.index == index).map(entry => entry.alias);
        return aliases; 
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
        let response = await this.client.cat.indices({
            h: ['index', 'docs.count', 'health', 'status'],
            format: 'json'
        });
        return response
            .filter(json => {
                // the index name must consist of the base name + the date string which is
                // 18 characters long
                // in case we want to get all indices just request with an empty baseName
                return json.index.startsWith(baseName);
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

    async bulkWithIndexName(index: string, type, data): Promise<BulkResponse> {
        index = this.addPrefixIfNotExists(index) as string;
        try {
            let response = await this.client.bulk({
                index,
                operations: data
            });
            if (response.errors) {
                response.items.forEach(item => {
                    let e = item.index?.error;
                    if (e) {
                        this.handleError(`Error during indexing on index '${index}' for item.id '${item.index._id}': ${JSON.stringify(e)}`, e);
                    }
                });
            }
            log.debug('Bulk finished of data #items: ' + data.length / 2);
            return {
                queued: false,
                response: response
            };
        }
        catch (e) {
            this.handleError('Error during bulk indexing of #items: ' + data.length / 2, e);
        }
    }

    async addOperationChunksToBulk(boxedOperations: EsOperation[]): Promise<BulkResponse> {
        let operationChunk = [];
        let index: string;
        for (let { operation, _id, _index, document } of boxedOperations) {
            if (!_index) {
                // use standard index (this.indexName) if no index was given
                _index = this.indexName;
            }
            if (!index) {
                // set index for this box of operations if not already set
                index = _index;
            }
            if (index != _index) {
                // a box of operations must target the same index
                throw new Error(`Different indices in the same ES boxedOperations chunk (${index}, ${_index})`)
            }
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
        if (!(index in this._bulkOperationChunks)) {
            this._bulkOperationChunks[index] = [];
        }
        this._bulkOperationChunks[index].push(operationChunk);

        if (this._bulkOperationChunks[index].length >= ElasticsearchUtils.maxBulkSize) {
            return this.sendBulkOperations(index);
        }
        else {
            return new Promise(resolve => resolve({
                queued: true
            }));
        }
    }

    async addDocToBulk(document, id, maxBulkSize=ElasticsearchUtils.maxBulkSize): Promise<BulkResponse> {
        return this.addOperationChunksToBulk([{ operation: 'index', _id: id, document }]);
    }

    async sendBulkOperations(index?: string): Promise<BulkResponse> {
        let promises: Promise<BulkResponse>[] = [];
        let indices = index != null ? [index] : Object.keys(this._bulkOperationChunks);
        for (let idx of indices) {
            let bulkOperationChunksPerIndex = this._bulkOperationChunks[idx];
            if (bulkOperationChunksPerIndex.length > 0) {
                log.debug('Sending BULK message with ' + bulkOperationChunksPerIndex.length + ' operation chunks to ' + idx);
                let promise = this.bulkWithIndexName(idx, null, bulkOperationChunksPerIndex.flat(1));
                this._bulkOperationChunks[idx] = [];
                promises.push(promise);
            }
            else {
                promises.push(new Promise(resolve => resolve({
                    queued: true
                })));
            }
        }
        if (promises.length == 1) {
            return promises[0];
        }
        Promise.all(promises);
    }

    private handleError(message: string, error: any) {
        this.summary?.elasticErrors?.push(message);
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

    async search(index: string | string[], body: object, usePrefix: boolean = true): Promise<{ hits: any }> {
        if (usePrefix) {
            index = this.addPrefixIfNotExists(index);
        }
        let response = await this.client.search({
            index,
            ...body
        });
        return response;
    }

    async get(index: string, id: string): Promise<any> {
        index = this.addPrefixIfNotExists(index) as string;
        try {
            return await this.client.get({
                index,
                id
            });
        }
        catch (err) {
            // swallow quietly and just return undefined
            // this.handleError(`Could not retrieve document with ID [${id}] from index [${index}]`, err);
        }
        return undefined;
    }

    async getHistory(body: object, size = 30): Promise<{ history: any }> {
        let response = await this.client.search({
            index: this.indexName,
            ...body,
            size
        });
        return { history: response.hits.hits.map(entry => entry._source) };
    }

    async getAccessUrls(after_key): Promise<any> {
        let response: any = await this.client.search({
            index: this.config.prefix + '*',
            ...this.elasticQueries.getAccessUrls(after_key),
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
        let response: any = await this.client.search({
            index: this.config.alias,
            ...this.elasticQueries.getFacetsByAttribution(),
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
                query: {
                    "match_all": {}
                }
            }).then(function getMoreUntilDone(response) {
                response.hits.hits.forEach(function (hit) {
                    results.push(hit);
                });

                let totalHits = typeof response.hits.total == 'number' ? response.hits.total : response.hits.total.value;
                if (totalHits !== results.length) {
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
            let response = await this.client.cat.indices({
                h: ['index'],
                format: 'json'
            })
            return response.some(json => index === json.index);
        }
        catch(e) {
            this.handleError('Error while checking existence of index: ' + index, e);
        }
    }

    async index(index: string, document: object, usePrefix: boolean = true) {
        if (usePrefix) {
            index = this.addPrefixIfNotExists(index) as string;
        }
        await this.client.index({ index, document });
        await this.flush();
    }

    async update(index: string, id: string, document: object, usePrefix: boolean = true) {
        if (usePrefix) {
            index = this.addPrefixIfNotExists(index) as string;
        }
        await this.client.update({ index, id, doc: document });
        await this.flush();
    }

    async deleteByQuery(days: number) {
        await this.client.deleteByQuery({
            index: this.indexName,
            query: {
                range: {
                    timestamp: {
                        lt: "now-" + days + "d/d"
                    }
                }
            }
        });
    }

    async deleteDocument(index: string, id: string) {
        index = this.addPrefixIfNotExists(index) as string;
        await this.client.delete({
            index,
            id
        });
    }

    async ping() {
        return await this.client.ping();
    }
}
