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
        return new Promise((resolve) => {
            if (this.settings.includeTimestamp) this.indexName += '_' + this.getTimeStamp( new Date() );
            this.client.indices.create({ index: this.indexName, waitForActiveShards: '1' })
                .then(() => this.addMapping(this.indexName, this.settings.indexType, mapping, settings, resolve))
                .catch(err => {
                    if (err.message.indexOf( 'index_already_exists_exception' ) !== -1) {
                        log.info( 'Index ' + this.indexName + ' not created, since it already exists.' );
                    } else {
                        log.error( 'Error occurred creating index', err );
                    }
                });
        });
    }

    finishIndex() {
        if (this.settings.alias) {
            this.client.cluster.health({waitForStatus: 'yellow'})
                .then(() => this.deleteOldIndices(this.settings.index, this.indexName))
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
    addMapping(index, type, mapping, settings, callback) {

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
                callback();
            } );
        };

        // in order to update settings the index has to be closed
        const handleClose = () => {
            this.client.indices.close({ index: index }, handleSettings);
        };

        this.client.indices.create({ index: index }, () => setTimeout(handleClose, 1000));
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
                    reject(err);
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
        return new Promise((resolve, reject) => {
            this.newerDuplicatesFor(doc, id)
                .then(result => {
                    let promise = null;

                    if (result.length > 0) {
                        log.warn(`Skipping document with generated_id '${doc.extras.generated_id}' since it is a duplicate of document with generated_id '${result[0]._source.extras.generated_id}' from index '${result[0]._index}'`);
                    } else {
                        this._bulkData.push({
                            index: {
                                _id: id
                            }
                        });
                        this._bulkData.push(doc);

                        // send data to elasticsearch if limit is reached
                        // TODO: don't use document size but bytes instead
                        if (this._bulkData.length > this.maxBulkSize) {
                            promise = this.sendBulkData();
                        }
                    }
                    if (promise) {
                        // Wait until the bulk data has been sent
                        // TODO perform this check before finishing index and not here
                        promise.then(() => resolve())
                            .catch(err => reject(err));
                    } else {
                        resolve();
                    }
                })
                .catch(err => reject(err));
        });
    }

    /**
     * Send all collected bulk data if any.
     *
     * @param {boolean=} closeAfterBulk
     */
    sendBulkData(closeAfterBulk) {
        if (this._bulkData.length > 0) {
            log.debug('Sending BULK message with ' + this._bulkData.length + ' items to index ' + this.indexName);
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

    /**
     * Returns the creation date for the dataset with the given name, if it
     * exists. Null otherwise.
     *
     * @param id id of dataset to search
     */
    searchById(id) {
        return new Promise((resolve,  reject) => {
            const response = this.client.search({
                index: this.settings.alias,
                body: {
                    query: {
                        bool: {
                            filter: {
                                term: {
                                    "_id": id
                                }
                            }
                        }
                    }
                }
            });

            response.then(res => resolve(res))
                .catch(err => {
                    //log.warn("Error searching by id", err);
                    resolve({ hits: { total: 0}})
                });
        });
    }

    /**
     * Searches duplicates with newer modification dates for the given document
     * and the given id.
     *
     * Indexed documents with the following properties are returned:
     * - modified date is strictly newer than the given document's modification
     *   date, AND
     * - Any of the following is true:
     *     - _id is equal to the document's _id or id field
     *     - Given id is equal to the the document's _id or id field
     *     - All of the following are true:
     *         - Titles with 3 words or less match exactly OR longer titles have
     *           at least 75% words matching
     *         - The download urls match exactly
     *
     *
     * @param doc document for which to search duplicates
     * @param id value to be assigned to the _id field of the document above
     * @returns {*|Promise} array of duplicate documents, empty array if no
     * duplicates were found
     */
    newerDuplicatesFor(doc, id) {
        let generatedId = doc.extras.generated_id;
        let source = doc.extras.metadata.source;
        let dt = doc.modified;
        let title = doc.title;

        let urls = [];
        doc.distribution.forEach(dist => {
            if (dist.accessURL) {
                urls.push(dist.accessURL);
            }
        });

        return new Promise((resolve, reject) => {
            const response = this.client.search({
                index: this.settings.alias,
                body: {
                    query: {
                        bool: {
                            must: [
                                {"range": {"modified": {"gt": dt}}},
                                {
                                    query: {
                                        bool: {
                                            should: [
                                                {term: {"extras.generated_id": id}},
                                                {term: {"extras.generated_id": generatedId}},
                                                {term: {"_id": id}},
                                                {term: {"_id": generatedId}},
                                                {
                                                    query: {
                                                        bool: {
                                                            must: [
                                                                { "terms": { "distribution.accessURL": urls } },
                                                                {
                                                                    match: {
                                                                        "title.raw": {
                                                                            "query": title,
                                                                            "minimum_should_match": "3<80%"
                                                                        }
                                                                    }
                                                                }
                                                            ]
                                                        }
                                                    }
                                                }
                                            ]
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
            });

            response.then(results => resolve(results.hits.hits))
                .catch(err => {
                    //log.warn("Error searching duplicates", err);
                    resolve([]);
                });
        })
    }
}

module.exports = ElasticSearchUtils;
