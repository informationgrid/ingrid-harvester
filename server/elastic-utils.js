'use strict';

let elasticsearch = require('elasticsearch'),
    log = require('log4js').getLogger(__filename),
    Promise = require('promise');

class ElasticSearchUtils {

    constructor(settings) {
        this.settings = settings;

        // the elasticsearch client for access the cluster
        this.client = new elasticsearch.Client({
            host: this.settings.elasticSearchUrl
                //log: 'trace'
        });
        this._bulkData = [];
        this.maxBulkSize = 200;
        this.indexName = this.settings.index;
    }

    /**
     *
     * @param mapping
     * @param settings
     */
    prepareIndex(mapping, settings) {
        if (this.settings.includeTimestamp) this.indexName += '_' + this.getTimeStamp(new Date());
        this.client.indices.create({
            index: this.indexName
        }, err => {
            if (err) {
                if (err.message.indexOf('index_already_exists_exception') !== -1) {
                    log.info('Index ' + this.indexName + ' not created, since it already exists.');
                } else {
                    log.error('Error occurred creating index', err);
                }
            } else {
                this.addMapping(this.indexName, this.settings.indexType, mapping, settings);
            }
        });
    }

    finishIndex() {
        if (this.settings.alias) {
            this.deleteOldIndices(this.settings.index, this.indexName)
              .then(() => this.addAlias(this.indexName, this.settings.alias))
              .then(() => {
                  this.client.close();
                  log.info('Successfully added data into new index: ' + this.indexName);
              });
        }
    }


    /**
     * Add the specified alias to an index.
     *
     * @param {string} index
     * @param {string} alias
     */
    addAlias(index, alias) {
        return new Promise((resolve, reject) => {
            // log.debug('adding alias');
            this.client.indices.putAlias({
                index: index,
                name: alias
            }, err => {
                if (err) {
                    log.error('Error occurred adding alias', err);
                    reject();
                    return;
                }
                resolve();
            });
        });
    }


    /**
     * Delete all indeces starting with indexBaseName but not indexName .
     *
     * @param {string} indexBaseName
     * @param {string} indexName
     */
    deleteOldIndices(indexBaseName, indexName) {
        return new Promise((resolve, reject) => {
            // log.debug('deleting index');
            this.client.cat.indices({
                h: ['index']
            }, (err, body) => {
                if (err) {
                    log.error('Error occurred geting index names', err);
                    reject();
                    return;
                }
                let lines = body.split('\n');
                lines.pop(); //the last line is empty by default
                lines.forEach((line, index) => {
                    lines[index] = line.trim();
                });
                lines = lines.filter(line => {
                    if (line.startsWith(indexBaseName)) {
                        if (line !== indexName) return true;
                    }
                });
                if (lines.length) {
                    this.client.indices.delete({
                        index: lines
                    }, err => {
                        if (err) {
                            log.error('Error occurred deleting indeces', err);
                            reject();
                            return;
                        }
                        resolve();
                    });
                } else {
                    resolve();
                }
            });
        });
    }


    /**
     * Add the specified mapping to an index and type.
     *
     * @param {string} index
     * @param {string} type
     * @param {object} mapping
     * @param {object} settings
     */
    addMapping(index, type, mapping, settings) {

        // set settings
        const handleSettings = () => {
            this.client.indices.putSettings( {
                index: index,
                body: settings
            }, err => {
                if (err) log.error( 'Error occurred adding settings', err );
                else handleMapping(); //this.client.indices.open({ index: index });
            } );
        };

        // set mapping
        const handleMapping = () => {
            this.client.indices.putMapping( {
                index: index,
                type: type,
                body: mapping
            }, err => {
                if (err) log.error( 'Error occurred adding mapping', err );
                else this.client.indices.open({ index: index });
            } );
        };

        // in order to update settings the index has to be closed
        const handleClose = () => {
            this.client.indices.close({ index: index }, handleSettings);
        };

        this.client.indices.create({ index: index }, handleClose);
        // handleSettings();

    }

    /**
     * Index data in batches
     * @param {object} data
     * @param {boolean} closeAfterBulk
     */
    bulk(data, closeAfterBulk) {
        return new Promise((resolve, reject) => {
            this.client.bulk({
                index: this.indexName,
                type: this.settings.indexType,
                body: data
            }, (err) => {
                if (err) {
                    log.error('Error occurred during bulk index', err);
                    reject();
                    return;
                }
                if (closeAfterBulk) {
                    this.client.close();
                }
                resolve();
            });
        });
    }

    /**
     * Add a document to the bulk array which will be sent to the elasticsearch node
     * if a certain limit {{maxBulkSize}} is reached.
     * @param doc
     * @param {string|number} id
     */
    addDocToBulk(doc, id) {
        this._bulkData.push({
            index: {
                _id: id
            }
        });
        this._bulkData.push(doc);

        // send data to elasticsearch if limit is reached
        // TODO: don't use document size but bytes instead
        if (this._bulkData.length > this.maxBulkSize) {
            return this.sendBulkData();
        }
    }

    /**
     * Send all collected bulk data if any.
     *
     * @param {boolean=} closeAfterBulk
     */
    sendBulkData(closeAfterBulk) {
        if (this._bulkData.length > 0) {
            log.debug('Sending BULK message');
            let promise = this.bulk(this._bulkData, closeAfterBulk);
            this._bulkData = [];
            return promise;
        }
        return new Promise().resolve();
    }

    /**
     * Returns a new Timestamp string
     */
    getTimeStamp(date) {
        let stamp = String(date.getFullYear());
        stamp += ('0' + (date.getMonth()+1)).slice(-2);
        stamp += ('0' + date.getDate()).slice(-2);
        stamp += ('0' + date.getHours()).slice(-2);
        stamp += ('0' + date.getMinutes()).slice(-2);
        stamp += ('0' + date.getSeconds()).slice(-2);
        stamp += ('00' + date.getMilliseconds()).slice(-3);
        return stamp;
    }
}

module.exports = ElasticSearchUtils;
