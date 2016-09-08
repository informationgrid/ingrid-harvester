'use strict';

let request = require( 'request-promise' ),
    async = require( 'async' ),
    log = require( 'log4js' ).getLogger( __filename ),
    ElasticSearchUtils = require( './../elastic-utils' ),
    mapping = require( '../elastic.mapping.js' );

class GovDataImporter {

    /**
     * Create the importer and initialize with settings.
     * @param { {urlSearch, urlData, mapper} }settings
     */
    constructor(settings) {
        this.settings = settings;
        this.elastic = new ElasticSearchUtils(settings);

        this.options_url_ids = {
            uri: settings.urlSearch,
            headers: {'User-Agent': 'Request-Promise'},
            json: true
        };
        this.options_url_dataset = {
            uri: settings.urlData,
            headers: {'User-Agent': 'Request-Promise'},
            json: true
        };
    }

    /**
     * Requests a dataset with the given ID and imports it to Elasticsearch.
     * @param {string} id
     * @param {function} callback
     */
    async importDataset(id, callback) {
        let options = Object.assign( {}, this.options_url_dataset );
        options.uri += id;
        try {
            let json = await request.get( options );
            let doc = {};
            log.debug( 'dataset: ' + id );

            // process all tasks in the mapping pipeline
            this.settings.mapper.forEach( mapper => mapper.run( json, doc ) );

            this.elastic.addDocToBulk( doc, doc.id );

            // signal finished operation so that the next asynchronous task can run
            callback();

        } catch (err) {
            log.error( 'Error: ' + err.statusCode );
        }
    }

    async run() {
        try {

            // prepare index with correct mapping
            this.elastic.prepareIndex( mapping );

            // get all IDs of the documents to be fetched
            let json = await request.get( this.options_url_ids );
            let ids = json[ 'results' ];
            log.debug( 'result:' + JSON.stringify( json ) );

            // create the queue and fill it with all the tasks
            // it's important to call method with the correct scope here, so that class properties can be accessed!
            let self = this;
            let queue = async.queue( function() { self.importDataset.call(self, ...arguments); }, 10 );
            ids.forEach( id => queue.push( id ) );

            // when queue is empty then send the last data form bulk and close the client
            queue.drain = () => {
                log.info( 'queue is empty' );
                // send rest of the data to elasticsearch and close the client
                this.elastic.sendBulkData( true );
            };

        } catch (err) {
            log.error( 'error:', err );
        }
    }
}

module.exports = GovDataImporter;