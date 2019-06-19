import {Summary} from '../model/summary';
import {ImporterSettings} from '../importer';

let elasticsearch = require('elasticsearch'),
    log = require('log4js').getLogger(__filename);

export type ElasticSettings = {
    elasticSearchUrl: string, index: string, indexType?: string, alias: string, deduplicationAlias?: string, includeTimestamp: boolean
}

export const DefaultElasticsearchSettings: ElasticSettings = {
    elasticSearchUrl: 'localhost:9200',
    index: '',
    alias: '',
    includeTimestamp: true
};

export interface BulkResponse {
    queued: boolean;
    response?: any;
}

export class ElasticSearchUtils {
    public static maxBulkSize = 100;

    settings: ElasticSettings & ImporterSettings;
    client: any;
    _bulkData;
    duplicateStaging;
    indexName: string;
    deduplicationAlias: string;

    summary: Summary;

    constructor(settings, summary: Summary) {
        this.settings = settings;
        this.summary = summary;

        // the elasticsearch client for access the cluster
        this.client = new elasticsearch.Client({
            host: this.settings.elasticSearchUrl
                //log: 'trace'
        });
        this._bulkData = [];
        this.duplicateStaging = [];
        this.indexName = this.settings.index;
        this.deduplicationAlias = this.settings.deduplicationAlias;
    }

    /**
     *
     * @param mapping
     * @param settings
     */
    prepareIndex(mapping, settings) {
        return new Promise((resolve, reject) => {
            if (this.settings.includeTimestamp) this.indexName += '_' + this.getTimeStamp( new Date() );
            this.client.indices.create({ index: this.indexName, waitForActiveShards: '1' })
                .then(() => this.addMapping(this.indexName, this.settings.indexType, mapping, settings, resolve))
                .then(() => this.addAlias(this.indexName, this.deduplicationAlias))
                .catch(err => {
                    let message = 'Error occurred creating index';
                    if (err.message.indexOf( 'index_already_exists_exception' ) !== -1) {
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

        // Deduplication alias doesn't need to be deleted. It will stop existing
        // once all the old indices it points to are deleted.
        if (this.settings.alias) {
            return this.client.cluster.health({waitForStatus: 'yellow'})
                .then(() => this.sendBulkData(false))
                .then(() => this._deduplicate())
                .then(() => this.deleteOldIndices(this.settings.index, this.indexName))
                .then(() => this.addAlias(this.indexName, this.settings.alias))
                .then(() => {
                    this.client.close();
                    log.info('Successfully added data into new index: ' + this.indexName);
                })
                .catch(err => log.error('Error finishing index', err));
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
                    this.handleError('Error occurred adding alias', err);
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }


    /**
     * Delete all indices starting with indexBaseName but not indexName .
     *
     * @param {string} indexBaseName
     * @param {string} indexName
     */
    deleteOldIndices(indexBaseName, indexName) {
        return new Promise((resolve, reject) => {
            // log.debug('deleting index');
            this.client.cat.indices({
                h: ['index'],
                format: ''
            }, (err, body) => {
                if (err) {
                    this.handleError('Error occurred getting index names', err);
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
                            this.handleError('Error occurred deleting indeces', err);
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
     * Deletes the current index, if for example there was an error during
     * harvesting from the data source.
     *
     * @returns {Promise} a promise for the action deleting the current index
     */
    abortCurrentIndex() {
        log.info(`Deleting index: ${this.indexName}`);
        return this.client.indices.delete({index: this.indexName});
    }


    /**
     * Add the specified mapping to an index and type.
     *
     * @param {string} index
     * @param {string} type
     * @param {object} mapping
     * @param {object} settings
     * @param callback
     */
    addMapping(index, type, mapping, settings, callback) {

        // set settings
        const handleSettings = () => {
            this.client.indices.putSettings( {
                index: index,
                body: settings
            }, err => {
                if (err) {
                    this.handleError( 'Error occurred adding settings', err );
                }
                else handleMapping(); //this.client.indices.open({ index: index });
            } );
        };

        // set mapping
        const handleMapping = () => {
            this.client.indices.putMapping( {
                index: index,
                type: type || 'base',
                body: mapping
            }, err => {
                if (err) {
                    this.handleError( 'Error occurred adding mapping', err );
                }
                else this.client.indices.open({ index: index }, errOpen => {
                    if (errOpen) {
                        this.handleError('Error opening index', errOpen);
                    }
                    callback();
                });
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
    bulk(data, closeAfterBulk): Promise<BulkResponse> {
        return new Promise((resolve, reject) => {
            try {
                this.client.bulk({
                    index: this.indexName,
                    type: this.settings.indexType || 'base',
                    body: data
                })
                .then((response) => {
                    let errors = [];
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
                    log.debug('Bulk finished of data #items: ' + data.length/2);
                    resolve({
                        queued: false,
                        response: response
                    });
                })
                .catch(err => {
                    this.handleError('Error occurred during bulk index of #items: ' + data.length/2, err);
                    if (closeAfterBulk) {
                        this.client.close();
                    }
                    reject(err);
                });
            } catch(e) {
                this.handleError('Error during bulk indexing of #items: ' + data.length/2, e);
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

        this._queueForDuplicateSearch(doc, id);

        // send data to elasticsearch if limit is reached
        // TODO: don't use document size but bytes instead
        if (this._bulkData.length >= (ElasticSearchUtils.maxBulkSize*2)) {
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
            log.debug('Sending BULK message with ' + (this._bulkData.length/2) + ' items to index ' + this.indexName);
            let promise = this.bulk(this._bulkData, closeAfterBulk);
            this._bulkData = [];
            return promise;
        }
        return new Promise(resolve => resolve({
            queued: true
        }));
    }

    // FIXME: Refactor deduplication in own file
    // FIXME: deduplication must work differently when import is not started for all harvesters
    async _deduplicate() {
        await this._deduplicateByTitle();
        await this._deduplicateUsingQuery();
    }

    // FIXME: deduplication must work differently when import is not started for all harvesters
    async _deduplicateUsingQuery() {
        log.debug(`Looking for duplicates for items in index '${this.indexName}`);
        // TODO: make sure the index was refreshed to get the updated results (e.g. previous deletion of duplicated items)

        // Send data in chunks. Don't send too much at once.
        let maxSize = 5;
        let count = 0;
        for(let i=0; i<this.duplicateStaging.length; i += maxSize) {
            let body = [];
            let end = Math.min(this.duplicateStaging.length, i + maxSize);

            let slice = this.duplicateStaging.slice(i, end);

            slice.forEach(item => {
                body.push({index: this.deduplicationAlias});
                body.push(item.query);
            });

            if (body.length < 1) return; // Don't send an empty query

            try {
                let results = await this.client.msearch({body: body});
                for (let j = 0; j < results.responses.length; j++) {
                    let response = results.responses[j];

                    if (response.error) {
                        this.handleError("Error in one of the search responses:", response.error);
                        continue;
                    }
                    if (!response.hits) continue;

                    response.hits.hits.forEach(hit => {
                        let item = slice[j];
                        let title = item.title;

                        let myDate = item.modified;
                        let hitDate = hit._source.modified;

                        // Make sure we aren't comparing apples to oranges.
                        // Convert to dates, if not already the case.
                        if (typeof myDate === 'string') myDate = Date.parse(myDate);
                        if (typeof hitDate === 'string') hitDate = Date.parse(hitDate);

                        if (typeof myDate === 'number') myDate = new Date(myDate);
                        if (typeof hitDate === 'number') hitDate = new Date(hitDate);

                        let q = {'delete': <any>{}};
                        let retained = '';
                        if (hitDate > myDate) {
                            // Hit is newer. Delete document from current index.
                            q.delete._index = this.indexName;
                            q.delete._type = this.settings.indexType;
                            q.delete._id = item.id;

                            retained = `Item to retain -> ID: '${hit._id}', Title: '${hit._source.title}', Index: '${hit._index};`;
                        } else { // Hit is older. Delete (h)it.
                            q.delete._index = hit._index;
                            q.delete._type = hit._type;
                            q.delete._id = hit._id;

                            title = hit._source.title;
                            retained = `Item to retain -> ID: '${item.id}', Title: '${title}', Index: '${this.indexName};`;
                        }

                        let deleted = `Item to delete -> ID: '${q.delete._id}', Title: '${title}', Index: '${q.delete._index}'`;

                        log.warn(`Duplicate item found and will be deleted.\n        ${deleted}\n        ${retained}`);
                        this._bulkData.push(q);
                        count++;
                    });
                }
            } catch (e) {
                this.handleError('Error during deduplication', e);
            }
        }

        // Perform bulk delete and resolve/reject the promise
        log.debug(`${count} duplicates found using the duplicates query will be deleted from the index '${this.indexName}'.`);
        await this.sendBulkData(false);
        log.debug(`Finished deleting duplicates found using the duplicates query in index ${this.indexName}`);
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
                    term: { '_id': id }
                }
            });
        });

        // Send data in chunks. Don't send too much at once.
        let dates = [];
        let maxSize = 2 * 3; // !!! IMPORTANT: This number has to be even. That is the reason for the funny way to calculate it. That way one cannot forget to set an odd number when changing the value. !!!
        for(let i=0; i<data.length; i += maxSize) {
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
        if (doc.extras.metadata.isValid === false) return;

        let generatedId = doc.extras.generated_id;
        let modified = doc.modified;
        let title = doc.title;

        // Make sure there are no nulls
        if (!generatedId) generatedId = '';
        if (!modified) modified = '';

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
                                    { term: { 'extras.generated_id' : id } },
                                    { term: { 'extras.generated_id' : generatedId } },
                                    { term: { '_id' : id } },
                                    { term: { '_id' : generatedId } },
                                    {
                                        bool: {
                                            must: [
                                                { terms: { 'distribution.accessURL': urls } },
                                                { term: { 'title.raw': title } }
                                            ]
                                        }
                                    }
                                ]
                            }
                        }
                    ],
                    must_not: [
                        { term: { 'extras.metadata.isValid': false } },
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

    // FIXME: deduplication must work differently when import is not started for all harvesters
    async _deduplicateByTitle() {
        // By default elasticsearch limits the count of aggregates to 10. Ask it
        // to return a lot more results!
        let maxAggregates = 10000;
        let query = {
            size: 0,
            query: {
                bool: {
                    must_not: { term: { 'extras.metadata.isValid': false } },
                }
            },
            aggregations: {
                duplicates: {
                    terms: {
                        field: 'title.raw',
                        min_doc_count: 2,
                        size: maxAggregates
                    },
                    aggregations: {
                        duplicates: {
                            top_hits: {
                                sort: [{ 'modified': { order: 'desc'} }],
                                _source: { include: [ 'title', 'distribution', 'modified' ] }
                            }
                        }
                    }
                }
            }
        };

        try {
            let response = await this.client.search({
                index: this.deduplicationAlias,
                body: query,
                size: 50
            });

            let count = 0;
            log.debug(`Count of buckets for deduplication aggregates query: ${response.aggregations.duplicates.buckets.length}`);
            response.aggregations.duplicates.buckets.forEach(bucket => {
                /*
                 * We asked the query to sort hits by modified dates. Newer hits are
                 * towards the beginning.
                 */
                try {
                    let hits = bucket.duplicates.hits.hits;
                    for (let i=1; i<hits.length; i++) {
                        let hit0 = hits[i-i];
                        let hit1 = hits[i];

                        // collect URLs from hits we want to compare
                        let urlsFromHit = [];
                        let urlsFromOtherHit = [];
                        hit0._source.distribution.forEach(dist => urlsFromHit.push(dist.accessURL));
                        hit1._source.distribution.forEach(dist => urlsFromOtherHit.push(dist.accessURL));

                        // only if all URLs are the same in both hits, we expect them to be equal AND have the same length
                        let remove =
                            urlsFromHit.length === urlsFromOtherHit.length
                            && urlsFromHit.every(url => urlsFromOtherHit.includes(url));

                        if (remove) {
                            let deleted = `Item to delete -> ID: '${hit1._id}', Title: '${hit1._source.title}', Index: '${hit1._index}'`;
                            let retained = `Item to retain -> ID: '${hit0._id}', Title: '${hit0._source.title}', Index: '${hit0._index}'`;
                            log.warn(`Duplicate item found and will be deleted.\n        ${deleted}\n        ${retained}`);
                            this._bulkData.push({
                                delete: {
                                    _index: hit1._index,
                                    _type: hit1._type,
                                    _id: hit1._id
                                }
                            });
                            count++;
                        }
                    }
                    return count;
                } catch (err) {
                    this.handleError(`Error deduplicating hits for URL ${bucket.key}`, err);
                }
            });
            log.info(`${count} duplicates found using the aggregates query will be deleted from index '${this.indexName}'.`);
        } catch (err) {
            this.handleError('Error processing results of aggregate query for duplicates', err);
        }
        await this.sendBulkData(false);
        log.debug(`Finished deleting duplicates found using the duplicates query in index ${this.indexName}`);
    }

    private handleError(message: string, error: any) {
        this.summary.elasticErrors.push(error.toString());
        log.error(message, error);
    }
}
