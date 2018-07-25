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
        this.duplicateStaging = [];
        this.maxBulkSize = 200;
        this.indexName = this.settings.index;
        this.deduplicationAlias = this.settings.deduplicationAlias;
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
                .then(() => this.addAlias(this.indexName, this.deduplicationAlias))
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
        // Deduplication alias doesn't need to be deleted. It will stop existing
        // once all the old indices it points to are deleted.
        if (this.settings.alias) {
            this.client.cluster.health({waitForStatus: 'yellow'})
                .then(() => this.sendBulkData(false))
                .then(() => this._deduplicate())
                .then(() => this.deleteOldIndices(this.settings.index, this.indexName))
                .then(() => this.addAlias(this.indexName, this.settings.alias))
                .then(() => {
                    this.client.close();
                    log.info('Successfully added data into new index: ' + this.indexName);
                })
                .catch(err => log.error("Error finishing index", err));
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
            this.client.cluster.health({waitForStatus: 'yellow'})
                .then(() => this.client.indices.close({ index: index }, handleSettings));
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
            try {
            this.client.bulk({
                index: this.indexName,
                type: this.settings.indexType,
                body: data
            })
                .then(response => {
                    if (response.errors) {
                        response.items.forEach(item => {
                            let err = item.index.error;
                            if (err) {
                                log.error(`Error during bulk indexing for item with id '${item.index._id}' was: ${JSON.stringify(err)}`);
                            }
                        });
                    }
                    if (closeAfterBulk) {
                        this.client.close();
                    }
                    resolve(response);
                })
                .catch(err => {
                    log.error('Error occurred during bulk index', err);
                    if (closeAfterBulk) {
                        this.client.close();
                    }
                    reject(err);
                });
            } catch(e) {
                log.error('Error during bulk indexing', e);
            }
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
            let promise = null;

            this._bulkData.push({
                index: {
                    _id: id
                }
            });
            this._bulkData.push(doc);

            this._queueForDuplicateSearch(doc, id);

            // send data to elasticsearch if limit is reached
            // TODO: don't use document size but bytes instead
            if (this._bulkData.length > this.maxBulkSize) {
                promise = this.sendBulkData();
            }
            if (promise) {
                // Wait until the bulk data has been sent
                // TODO perform this check before finishing index and not here
                promise.then(() => resolve())
                    .catch(err => reject(err));
            } else {
                resolve();
            }
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
        return new Promise(resolve => resolve());
    }

    _deduplicate() {
        return new Promise((resolve, reject) => {
            log.debug(`Looking for duplicates for items in index '${this.indexName}`);
            let body = [];
            this.duplicateStaging.forEach(item => {
                body.push({ index: this.deduplicationAlias });
                body.push(item.query);
            });

            if (body.length < 1) resolve(); // Don't send an empty query

            this.client.msearch({ body: body })
                .then(results => {
                    for(let i=0; i < results.responses.length; i++) {
                        if (!results.responses[i].hits) continue;

                        results.responses[i].hits.hits.forEach(hit => {
                            let item = this.duplicateStaging[i];
                            let title = item.title;

                            let myDate = item.modified;
                            let hitDate = hit._source.modified;

                            // Make sure we aren't comparing apples to oranges.
                            // Convert to dates, if not already the case.
                            if (typeof myDate === 'string') myDate = Date.parse(myDate);
                            if (typeof hitDate === 'string') hitDate = Date.parse(hitDate);

                            if (typeof myDate === 'number') myDate = new Date(myDate);
                            if (typeof hitDate === 'number') hitDate = new Date(hitDate);

                            let q = { "delete": {} };
                            if (hitDate > myDate) {
                                // Hit is newer. Delete document from current index.
                                q.delete._index = this.indexName;
                                q.delete._type = this.settings.indexTypes;
                                q.delete._id = item.id;
                            } else { // Hit is older. Delete (h)it.
                                q.delete._index = hit._index;
                                q.delete._type = hit._type;
                                q.delete._id = hit._id;

                                title = hit._source.title;
                            }

                            log.warn(`The following older duplicate item will be deleted. Id: '${q.delete._id}', Title: '${title}', Index: '${q.delete._index}'`);
                            this._bulkData.push(q);
                        });
                    }

                    // Perform bulk delete and resolve/reject the promise
                    log.debug(`Deleting duplicates found in index ${this.indexName}`);
                    this.sendBulkData(false)
                        .then(() => {
                            log.debug(`Finished deleting duplicates found in index ${this.indexName}`);
                            resolve();
                        })
                        .catch(err => reject(err));
                })
                .catch(err => reject(err));
        });
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

        let data = [];
        ids.forEach(id => {
            data.push({});
            data.push({
                query: {
                    term: { "_id": id }
                }
            });
        });

        // Send data in chunks. Don't send too much at once.
        let dates = [];
        let maxSize = 100;
        for(let i=0; i<data.length; i += maxSize) {
            let end = Math.min(data.length, i + maxSize);

            let slice = data.slice(i, end);
            let result = await this.client.msearch({
                index: this.settings.alias,
                body: slice
            });

            for(let j=0; j<result.responses.length; j++) {
                let response = result.responses[j];
                if (!response.hits) return null;

                let firstHit = response.hits.hits[0];
                try {
                    dates.push(firstHit._source.extras.metadata.issued);
                } catch (e) {
                    log.warn(`Error extracting issued date from elasticsearch response for id ${ids[j]}. Returned record was ${JSON.stringify(firstHit)}`, e);
                    dates.push(null);
                }
            };
        }

        return dates;
    }

    /**
     * Create a query for searching for duplicates of the given document and add
     * it to a queue to be executed later.
     *
     * @param doc document for which to search duplicates
     * @param id value to be assigned to the _id field of the document above
     */
    _queueForDuplicateSearch(doc, id) {
        // Don't search duplicates for invalid documents. Firstly, it is not
        // strictly necessarily and secondly, don't delete valid duplicates of
        // an invalid document
        if (!doc.extras.metadata.isValid) return;

        let generatedId = doc.extras.generated_id;
        let modified = doc.modified;
        let title = doc.title;

        // Make sure there are no nulls
        if (!generatedId) generatedId = "";
        if (!modified) modified = "";

        let urls = [];
        doc.distribution.forEach(dist => {
            if (dist.accessURL) {
                urls.push(dist.accessURL);
            }
        });

        /*
         * Should query needs to be wrapped in a must query so that if the
         * should query returns no hits, the must query doesn't match almost all
         * the documents in the index. The query looks for documents, where all
         * of the following are true:
         * - Either one of the following is true
         *     - The given id matches the document's id OR extras.generated_id
         *     - The given generated_id matches the document's id OR extras.generated_id
         *     - The given title matches up to 80% with the document's title AND
         *       at least one of the distribution.accessURL is the same
         * - extras.metadata.isValid is not false (true or missing values)
         *   (make sure we aren't deleting valid documents because of duplicates
         *   that aren't valid)
         * - given timestamp is not equal to the document's modified (date) field
         *   (don't compare this document to itself)
         */
        let query = {
            query: {
                bool: {
                    must: [
                        {
                            bool: {
                                should: [
                                    { term: { "extras.generated_id" : id } },
                                    { term: { "extras.generated_id" : generatedId } },
                                    { term: { "_id" : id } },
                                    { term: { "_id" : generatedId } },
                                    {
                                        bool: {
                                            must: [
                                                { terms: { "distribution.accessURL": urls } },
                                                {
                                                    match: {
                                                        "title.raw": {
                                                            query: title,
                                                            minimum_should_match: "3<80%"
                                                        }
                                                    }
                                                }
                                            ]
                                        }
                                    }
                                ]
                            }
                        }
                    ],
                    must_not: [
                        { term: { "extras.metadata.isValid": false } },
                        { term : { modified: modified } }
                    ]
                }
            }
        };
        this.duplicateStaging.push({
            id: id,
            modified: modified,
            title: doc.title,
            query: query
        });
    }
}

module.exports = ElasticSearchUtils;
