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
import {ElasticSettings} from '../utils/elastic.setting';
import {Index} from '@shared/index.model';
import {elasticsearchMapping} from "./statistic.mapping";
import {elasticsearchSettings} from "./statistic.settings";
import {ImportLogMessage} from "../model/import.result";

let elasticsearch = require('elasticsearch'),
    log = require('log4js').getLogger(__filename);

require('url').URL;

export interface BulkResponse {
    queued: boolean;
    response?: any;
}

export class StatisticUtils {
    public static maxBulkSize = 100;

    private static readonly LENGTH_OF_TIMESTAMP = 18;

    settings: ElasticSettings;
    client: any;
    _bulkData: any[];
    indexName: string;
    deduplicationAlias: string;



    constructor(settings) {
        this.settings = settings;

        // the elasticsearch client for access the cluster
        const url = new URL(this.settings.elasticSearchUrl);
        this.client = new elasticsearch.Client({
            // log: 'trace',
            host: {
                host: url.hostname,
                port: url.port,
                protocol: url.protocol,
                auth: 'elastic:' + this.settings.elasticSearchPassword,
            }
        });
        this._bulkData = [];
        this.indexName = "mcloud_harvester_statistic"
        this.deduplicationAlias = this.settings.deduplicationAlias;
    }

    async saveSummary(logMessage: ImportLogMessage, baseIndex: string){
        let timestamp = new Date();

        let errors = new Map();
        this.collectErrorsOrWarnings(errors, logMessage.summary.appErrors);
        this.collectErrorsOrWarnings(errors, logMessage.summary.elasticErrors);

        let warnings = new Map();
        this.collectErrorsOrWarnings(warnings, logMessage.summary.warnings.map(entry => entry[1]?entry[0]+": "+entry[1]:entry[0]));

        this.addDocToBulk({
                timestamp: timestamp,
                base_index: baseIndex,
                numRecords: logMessage.summary.numDocs,
                numSkipped: logMessage.summary.skippedDocs.length,
                numWarnings: logMessage.summary.warnings.length,
                numRecordErrors: logMessage.summary.numErrors,
                numAppErrors: logMessage.summary.appErrors.length,
                numESErrors: logMessage.summary.elasticErrors.length,
                duration: logMessage.duration,
                warnings: Array.from(warnings.entries()).map(entry => {return {message: entry[0], count: entry[1]}}),
                errors: Array.from(errors.entries()).map(entry => {return {message: entry[0], count: entry[1]}})
        }, baseIndex+"_"+timestamp.toISOString());

        await this.prepareIndex(elasticsearchMapping, elasticsearchSettings)
            .then(() => this.finishIndex())
            .catch(err => {
                let message = 'Error occurred creating statistic index';
                log.error(message, err);
            });
    }

    collectErrorsOrWarnings(result: Map<string, number>, messages: string[]){
        messages.forEach(message => {
            if(result.has(message))
                result.set(message, result.get(message)+1);
            else
                result.set(message, 1);
        })
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
        return new Promise<void>((resolve, reject) => {
            this.isIndexPresent(this.indexName).then((isPresent) => {

                if (!isPresent) {
                    this.client.indices.create({index: this.indexName, waitForActiveShards: '1', body: body})
                        .then(() => this.addMapping(this.indexName, this.settings.indexType, mapping, settings, resolve, reject))
                        .catch(err => {
                            let message = 'Error occurred creating statistic index';
                            log.error(message, err);
                            reject(message);
                        });
                } else {
                    this.client.indices.open({index: this.indexName, waitForActiveShards: '1'}).catch(err => {
                        let message = 'Error occurred creating statistic index';
                        log.error(message, err);
                        reject(message);
                    });
                    resolve();
                }
            });
        });
    }

    finishIndex() {
        return this.client.cluster.health({waitForStatus: 'yellow'})
            .then(() =>
                this.sendBulkData(false))
            .then(() => {
                log.info('Successfully added statistic data into index: ' + this.indexName);
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

    isIndexPresent(index: string){
        let result: boolean;
        return this.client.cat.indices({
            h: ['index'],
            format: 'json'
        }).then((body) => {
            return body
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
            }, err => {
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
                type: type || 'base',
                body: mapping
            }, err => {
                if (err) {
                    log.error('Error occurred adding mapping', err);
                    errorCallback('Mapping error');
                } else this.client.indices.open({index: index}, errOpen => {
                    if (errOpen) {
                        log.error('Error opening index', errOpen);
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


    /**
     * Send all collected bulk data if any.
     *
     * @param {boolean=} closeAfterBulk
     */
    sendBulkData(closeAfterBulk?): Promise<BulkResponse> {
        if (this._bulkData) {
            log.debug('Sending statistic data to index ' + this.indexName);
            let promise = this.bulk(this._bulkData, closeAfterBulk);
            this._bulkData = [];
            return promise;
        }
        return new Promise(resolve => resolve({
            queued: true
        }));
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

    search(indexName: string): Promise<any> {
        return this.client.search({ index: indexName });
    }
}
