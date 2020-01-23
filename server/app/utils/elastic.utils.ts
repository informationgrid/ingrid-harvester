import {Summary} from '../model/summary';
import {ImporterSettings} from '../importer.settings';
import {DeduplicateUtils} from './deduplicate.utils';
import {ElasticSettings} from './elastic.setting';
import {Index} from '@shared/index.model';

let elasticsearch = require('elasticsearch'),
    log = require('log4js').getLogger(__filename);

export const DefaultElasticsearchSettings: ElasticSettings = {
    // elasticSearchUrl: 'localhost:9200',
    index: '',
    // alias: '',
    includeTimestamp: true
};

export interface BulkResponse {
    queued: boolean;
    response?: any;
}

export class ElasticSearchUtils {
    public static maxBulkSize = 100;

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
        this.client = new elasticsearch.Client({
            host: this.settings.elasticSearchUrl
            //log: 'trace'
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
        return new Promise((resolve, reject) => {
            if (this.settings.includeTimestamp) this.indexName += '_' + this.getTimeStamp(new Date());
            this.client.indices.create({index: this.indexName, waitForActiveShards: '1'})
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
     * Searches the index for documents with the given ids and copies the issued
     * date from existing documents, if any exist. If multiple documents with
     * the same id are found, then the issued date is copied from the first hit
     * returned by elasticsearch. If no indexed document with the given id is
     * found, then null or undefined is returned.
     *
     * @param ids {Array} array of ids for which to look up the issued date
     * @returns {Promise<Array>}  array of issued dates (for found documents) or
     * nulls (for new documents) in the same order as the given ids
     */
    async getIssuedDates(ids) {
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
                        let response = result.responses[j];

                        if (response.error) {
                            this.handleError("Error in one of the search responses:", response.error);
                            continue;
                        }
                        try {
                            let firstHit = response.hits.hits[0];
                            dates.push(firstHit._source.extras.metadata.issued);
                        } catch (e) {
                            log.debug(`Did not find an existing issued date for dataset with id ${ids[j]}`);
                            dates.push(null);
                        }
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

    deleteIndex(indicesToDelete: string|string[]): Promise<any> {
        log.debug('Deleting indices: ' + indicesToDelete);
        return this.client.indices.delete({
            index: indicesToDelete
        });
    }

    search(indexName: string): Promise<any> {
        return this.client.search({ index: indexName });
    }
}
