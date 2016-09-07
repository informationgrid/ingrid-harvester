'use strict';

let elasticsearch = require( 'elasticsearch' ),
    log = require( 'log4js' ).getLogger(__filename),
    config = require( '../config' );

class ElasticSearchUtils {

    // the elasticsearch client for access the cluster
    /*client;
    bulkData;
    maxBulkSize;*/

    constructor() {
        this.client = new elasticsearch.Client( {
            host: config.elasticSearchUrl
            //log: 'trace'
        } );
        this.bulkData = [];
        this.maxBulkSize = 200;
    }

    /**
     *
     * @param index
     * @param type
     * @param mapping
     */
    prepareIndex(index, type, mapping) {
        this.client.indices.create({
            index: index
        }, err => {
            if (err) log.error( 'Error occurred creating index', err );
            else this.addMapping(index, type, mapping);
        });

    }

    /**
     *
     * @param index
     * @param type
     * @param mapping
     */
    addMapping(index, type, mapping) {
        this.client.indices.putMapping({
            index: index,
            type: type,
            body: mapping
        }, err => {
            if (err) log.error( 'Error occurred adding mapping', err );
        });
    }

    /*createIndex(index) {

    }

    post(index, type, data) {
        console.log( 'posting' );
    }*/

    /**
     * Index data in batches
     * @param {string} index
     * @param {string} type
     * @param {object} data
     * @param {boolean} closeAfterBulk
     */
    bulk(index, type, data, closeAfterBulk) {
        this.client.bulk( {
            index: index,
            type: type,
            body: data
        }, (err) => {
            if (err) {
                log.error( 'Error occurred during bulk index', err );
            }
            if (closeAfterBulk) this.client.close();
        } );
    }

    /**
     * Add a document to the bulk array which will be sent to the elasticsearch node
     * if a certain limit {{maxBulkSize}} is reached.
     * @param doc
     * @param {string|number} id
     * @param {string} index
     * @param {string} type
     */
    addDocToBulk(doc, id, index, type) {
        this.bulkData.push( {index: {_id: id}} );
        this.bulkData.push( doc );

        // send data to elasticsearch if limit is reached
        // TODO: don't use document size but bytes instead
        if (this.bulkData.length > this.maxBulkSize) {
            this.sendBulkData( index, type );
        }
    }

    /**
     * Send all collected bulk data if any.
     *
     * @param {string} index
     * @param {string} type
     * @param {boolean=} closeAfterBulk
     */
    sendBulkData(index, type, closeAfterBulk) {
        if (this.bulkData.length > 0) {
            log.debug('Sending BULK message');
            this.bulk( index, type, this.bulkData, closeAfterBulk );
            this.bulkData = [];
        }
    }
}

module.exports = new ElasticSearchUtils();