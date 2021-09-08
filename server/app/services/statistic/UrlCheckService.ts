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

let elasticsearch = require('elasticsearch'), log = require('log4js').getLogger(__filename);

const http = require('http');
const https = require('https');
const request = require('request');
//const axios = require('axios');

//const ftp = require('basic-ftp');

@Service()
export class UrlCheckService {
    private elasticUtils: ElasticSearchUtils;
    private _bulkData: any[];
    private generalSettings;
    private settings: ElasticSettings;
    private indexName: string;

    private client: any;

    constructor(private socketService: ImportSocketService) {
        this.generalSettings = ConfigService.getGeneralSettings();
        this.settings = {
            elasticSearchUrl: this.generalSettings.elasticSearchUrl,
            alias: this.generalSettings.alias,
            includeTimestamp: true,
            index: ''
        };

        // the elasticsearch client for access the cluster
        this.client = new elasticsearch.Client({
            host: this.settings.elasticSearchUrl
            //log: 'trace'
        });

        // @ts-ignore
        const summary: Summary = {};
        this.elasticUtils = new ElasticSearchUtils(this.settings, summary);
        this._bulkData = [];

        this.indexName = 'url_check_history';
    }

    async getHistory(){
        let history = await this.elasticUtils.getUrlCheckHistory();
        return {
            history: history
        }
    }

    async start() {
        log.info('UrlCheck started!')
        let start = now();
        let result = [];
        let after_key = undefined;
        let count = 0;
        do {
            let urls = await this.elasticUtils.getAccessUrls(after_key);
            count += urls.buckets.length;
            after_key = urls.after_key;
            await urls.buckets.map(url => this.getStatus(url)).reduce(function (statusMap, urlStatus) {
                return statusMap.then(statusMap => {
                    return urlStatus.then(
                        urlStatus => {
                            let status = urlStatus.status;
                            (statusMap[status] = statusMap[status] || []).push(urlStatus.url);
                            statusMap['status_list'] = statusMap['status_list'] || [];
                            if(statusMap['status_list'].indexOf(status) === -1)
                                statusMap['status_list'].push(status);
                            return statusMap;
                        });
                });
            }, new Promise((resolve) => {
                resolve(result);
            }));
            log.info('UrlCheck: ' + count);
        } while (after_key);

        let duration = now() - start;
        log.info('UrlCheck: ' + (duration / 1000) + 's');
        await this.saveResult(result, new Date(start), duration);

        this.cleanIndex();
    }

    private async getStatus(urlAggregation: any) {
        try {
            let url = urlAggregation.url.trim();
            if (!url.startsWith('ftp://')) {
                if(url.startsWith('/')){
                    if(this.generalSettings.portalUrl.endsWith('/'))
                        url = url.substring(1);
                    url = this.generalSettings.portalUrl + url;
                }
                let options: any = {timeout: 10000, proxy: this.generalSettings.proxy, rejectUnauthorized: false};
                let request_call = new Promise((resolve) => {
                        try {
                            request.head(url, options, function (error, response) {
                                if (!error) {
                                    resolve({url: urlAggregation, status: response.statusCode});
                                } else {
                                    resolve({url: urlAggregation, status: UrlCheckService.mapErrorMsg(error.toString())});
                                }
                            });
                            /*
                            client.request(url, options, (res) => {
                                //console.log(url + ': ' + res.statusCode);
                                resolve({url: urlAggregation, status: res.statusCode});
                            }).on('error', (err) => {
                                //console.error(url + ': ' + err);
                                resolve({url: urlAggregation, status: this.mapErrorMsg(err.toString())});
                            }).end();*/
                        } catch (ex) {
                            //console.error(url + ': ' + ex);
                            resolve({url: urlAggregation, status: UrlCheckService.mapErrorMsg(ex.toString())});
                        }
                    }
                );
                return request_call;
            } else {
                return new Promise((resolve) => {
                    //console.error(url + ': ftp');
                    resolve({url: urlAggregation, status: 'ftp'});
                });
            }
        } catch (ex) {
            //console.error(url + ': ' + ex);
            return new Promise((resolve) => {
                resolve({url: urlAggregation, status: UrlCheckService.mapErrorMsg(ex.toString())});
            });
        }
    }

    static mapErrorMsg(msg: string): string {
        let result = msg;
        if (msg.indexOf('ETIMEDOUT') !== -1) result = 'ETIMEDOUT';
        if (msg.indexOf('ESOCKETTIMEDOUT') !== -1) result = 'ESOCKETTIMEDOUT';
        if (msg.indexOf('ENOTFOUND') !== -1) result = 'ENOTFOUND';
        if (msg.indexOf('ECONNRESET') !== -1) result = 'ECONNRESET';
        if (msg.indexOf('ERR_INVALID_URL') !== -1 || msg.indexOf('Error: Invalid URI')  !== -1) result = 'ERR_INVALID_URL';
        if (msg.indexOf('ERR_UNESCAPED_CHARACTERS') !== -1) result = 'ERR_UNESCAPED_CHARACTERS';
        if (msg.indexOf('ECONNREFUSED') !== -1) result = 'ECONNREFUSED';
        if (msg.indexOf('Exceeded maxRedirects') !== -1) result = 'Exceeded maxRedirects';
        return result;
    }

    async saveResult(result, timestamp, duration) {
        let status_list = result['status_list'];
        if (status_list) {
            let status_map = [];
            for (let i = 0; i < status_list.length; i++) {
                let status = status_list[i];
                let urls = result[status];
                status_map.push({
                    code: status.toString(),
                    url: urls
                })
            }

            this.addDocToBulk({
                timestamp: timestamp,
                duration: duration,
                status: status_map
            }, timestamp.toISOString());

            await this.prepareIndex(elasticsearchMapping, elasticsearchSettings)
                .then(() => this.finishIndex())
                .catch(err => {
                    let message = 'Error occurred creating UrlCheck index';
                    log.error(message, err);
                });
        }
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
        let body = {
            number_of_shards: this.generalSettings.numberOfShards,
            number_of_replicas: this.generalSettings.numberOfReplicas
        }
        return new Promise((resolve, reject) => {
            this.isIndexPresent(this.indexName).then((isPresent) => {

                if (!isPresent) {
                    this.client.indices.create({index: this.indexName, waitForActiveShards: '1', body: body})
                        .then(() => this.addMapping(this.indexName, this.settings.indexType, mapping, settings, resolve, reject))
                        .catch(err => {
                            let message = 'Error occurred creating UrlCheck index';
                            log.error(message, err);
                            reject(message);
                        });
                } else {
                    this.client.indices.open({index: this.indexName, waitForActiveShards: '1'}).catch(err => {
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
        return this.client.cluster.health({waitForStatus: 'yellow'})
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

    private async cleanIndex() {
        log.info('Cleanup UrlCheckHistory')
        await this.elasticUtils.cleanUrlCheckHistory(40)
    }
}
