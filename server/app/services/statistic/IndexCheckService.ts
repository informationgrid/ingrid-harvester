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

import {Service} from '@tsed/di';
import {ImportSocketService} from '../../sockets/import.socket.service';
import {ElasticSearchUtils} from "../../utils/elastic.utils";
import {ConfigService} from "../config/ConfigService";
import {ElasticSettings} from "../../utils/elastic.setting";
import {Summary} from "../../model/summary";
import {now} from "moment";
import {elasticsearchMapping} from "../../statistic/url_check.mapping";
import {elasticsearchSettings} from "../../statistic/url_check.settings";
import {BulkResponse} from "../../statistic/statistic.utils";
import { Client } from '@elastic/elasticsearch';

let log = require('log4js').getLogger(__filename);

require('url').URL;

@Service()
export class IndexCheckService {
    private elasticUtils: ElasticSearchUtils;
    private _bulkData: any[];
    private generalSettings;
    private settings: ElasticSettings;
    private indexName: string;

    private client: Client;

    constructor(private socketService: ImportSocketService) {
        this.generalSettings = ConfigService.getGeneralSettings();
        this.settings = {
            elasticSearchUrl: this.generalSettings.elasticSearchUrl,
            elasticSearchPassword: this.generalSettings.elasticSearchPassword,
            alias: this.generalSettings.alias,
            includeTimestamp: true,
            index: ''
        };

        // the elasticsearch client for accessing the cluster
        this.client = new Client({
            node: this.settings.elasticSearchUrl,
            auth: {
                username: 'elastic',
                password: this.settings.elasticSearchPassword
            },
            requestTimeout: 30000
        });

        // @ts-ignore
        const summary: Summary = {};
        this.elasticUtils = new ElasticSearchUtils(this.settings, summary);
        this._bulkData = [];

        this.indexName = 'index_check_history';
    }

    async getHistory(){
        let history = await this.elasticUtils.getIndexCheckHistory();
        return {
            history: history
        }
    }

    async start() {
        log.info('IndexCheck started!')
        let start = now();
        let facetsByAttribution = await this.elasticUtils.getFacetsByAttribution();
        this.saveResult(facetsByAttribution, new Date(start));
    }

    async saveResult(result, timestamp) {
            this.addDocToBulk({
                timestamp: timestamp,
                attributions: result
            }, timestamp.toISOString());

            await this.prepareIndex(elasticsearchMapping, elasticsearchSettings)
                .then(() => this.finishIndex())
                .catch(err => {
                    let message = 'Error occurred creating UrlCheck index';
                    log.error(message, err);
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

        return new Promise(resolve => resolve({
            queued: true
        }));
    }

    /**
     *
     * @param mapping
     * @param settings
     */
    prepareIndex(mapping, settings) {
        let idxSettings = {
            number_of_shards: this.generalSettings.numberOfShards,
            number_of_replicas: this.generalSettings.numberOfReplicas
        }
        return new Promise<void>((resolve, reject) => {
            this.isIndexPresent(this.indexName).then(isPresent => {

                if (!isPresent) {
                    this.client.indices.create({index: this.indexName, wait_for_active_shards: 1, settings: idxSettings})
                        .then(() => this.addMapping(this.indexName, this.settings.indexType, mapping, settings, resolve, reject))
                        .catch(err => {
                            let message = 'Error occurred creating UrlCheck index';
                            log.error(message, err);
                            reject(message);
                        });
                } else {
                    this.client.indices.open({index: this.indexName, wait_for_active_shards: 1}).catch(err => {
                        let message = 'Error occurred creating UrlCheck index';
                        log.error(message, err);
                        reject(message);
                    });
                    resolve();
                }
            });
        });
    }

    finishIndex() {
        return this.client.cluster.health({wait_for_status: 'yellow'})
            .then(() =>
                this.sendBulkData(false))
            .then(() => {
                log.info('Successfully added UrlCheck data into index: ' + this.indexName);
            })
            .catch(err => log.error('Error finishing index', err));
    }

    isIndexPresent(index: string) {
        let result: boolean;
        return this.client.cat.indices({
            h: ['index'],
            format: 'json'
        }).then(response => {
            return response
                .some(json => {
                    return index === json.index;
                })
        }).catch(e => log.error(e));

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
            }).catch(err => {
                if (err) {
                    log.error('Error occurred adding settings', err);
                    errorCallback(err);
                } else handleMapping(); //this.client.indices.open({ index: index });
            });
        };

        // set mapping
        const handleMapping = () => {
            this.client.indices.putMapping({
                index: index,
                // type: type || 'base',
                body: mapping
            }).catch(err => {
                if (err) {
                    log.error('Error occurred adding mapping', err);
                    errorCallback('Mapping error');
                } else this.client.indices.open({index: index}).catch(errOpen => {
                    if (errOpen) {
                        log.error('Error opening index', errOpen);
                    }
                    callback();
                });
            });
        };

        // in order to update settings the index has to be closed
        const handleClose = () => {
            this.client.cluster.health({wait_for_status: 'yellow'})
                .then(() => this.client.indices.close({index: index}).then(handleSettings))
                .catch(() => {
                    log.error('Cluster state did not become yellow');
                    errorCallback('Elasticsearch cluster state did not become yellow');
                });
        };

        this.client.indices.create({index: index}).then(() => setTimeout(handleClose, 1000));
        // handleSettings();

    }

    /**
     * Send all collected bulk data if any.
     *
     * @param {boolean=} closeAfterBulk
     */
    sendBulkData(closeAfterBulk?): Promise<BulkResponse> {
        if (this._bulkData) {
            log.debug('Sending UrlCheck data to index ' + this.indexName);
            let promise = this.bulk(this._bulkData, closeAfterBulk);
            this._bulkData = [];
            return promise;
        }
        return new Promise(resolve => resolve({
            queued: true
        }));
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
                    // type: this.settings.indexType || 'base',
                    body: data
                })
                    .then(response => {
                        if (response.errors) {
                            response.items.forEach(item => {
                                let err = item.index.error;
                                if (err) {
                                    log.error(`Error during indexing on index '${this.indexName}' for item.id '${item.index._id}': ${JSON.stringify(err)}`, err);
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
                        log.error('Error occurred during bulk index of #items: ' + data.length / 2, err);
                        if (closeAfterBulk) {
                            this.client.close();
                        }
                        reject(err);
                    });
            } catch (e) {
                log.error('Error during bulk indexing of #items: ' + data.length / 2, e);
            }
        });
    }
}
