'use strict';

let request = require( 'request-promise' ),
    async = require( 'async' ),
    log = require( 'log4js' ).getLogger( __filename ),
    config = require( '../config' ),
    elastic = require( './elastic-utils' ),
    docMapper = require( './esMapper/ckan' ),
    mapping = require('./esMapper/ckan.mapping');

const options_url_ids = {
    uri: config.urlSearch,
    headers: {'User-Agent': 'Request-Promise'},
    json: true
};

const options_url_dataset = {
    uri: config.urlData,
    headers: {'User-Agent': 'Request-Promise'},
    json: true
};

const index = 'govdata2';
const indexType = 'transport_verkehr';

class GovDataImporter {

    constructor() {
    }


    /**
     * Requests a dataset with the given ID and imports it to Elasticsearch.
     * @param {string} id
     */
    async importDataset(id, callback) {
        let options = Object.assign( {}, options_url_dataset );
        options.uri += id;
        try {
            let json = await request.get( options );
            log.debug( 'dataset: ' + id );

            let doc = docMapper.map( json );
            elastic.addDocToBulk( doc, doc.id, index, indexType );
            callback();

        } catch (err) {
            log.error( 'Error: ' + err.statusCode );
        }
    }

    async main() {
        try {

            // prepare index with correct mapping
            elastic.prepareIndex(index, indexType, mapping);

            // get all IDs of the documents to be fetched
            let json = await request.get( options_url_ids );
            let ids = json[ 'results' ];
            log.debug( 'result:' + JSON.stringify( json ) );

            // create the queue and fill it with all the tasks
            let queue = async.queue( this.importDataset, 10 );
            ids.forEach( id => queue.push( id ) );

            // when queue is empty then send the last data form bulk and close the client
            queue.drain = function () {
                log.info( 'queue is empty' );
                // send rest of the data to elasticsearch and close the client
                elastic.sendBulkData( index, indexType, true );
            };

        } catch (err) {
            log.error( 'error:', err );
        }
    }
}


let importer = new GovDataImporter();
importer.main();

log.info( 'exit' );