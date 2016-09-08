'use strict';

let elasticsearch = require( 'elasticsearch' ),
    log = require( 'log4js' ).getLogger( __filename );

class ElasticSearchUtils {


    constructor(settings) {
        this.settings = settings;

        // the elasticsearch client for access the cluster
        this.client = new elasticsearch.Client( {
            host: this.settings.elasticSearchUrl
            //log: 'trace'
        } );
        this._bulkData = [];
        this.maxBulkSize = 200;
    }

    /**
     *
     * @param mapping
     */
    prepareIndex(mapping) {
        this.client.indices.create( {
            index: this.settings.index
        }, err => {
            if (err) {
                if (err.message.indexOf( 'index_already_exists_exception' ) !== -1) {
                    log.info( 'Index ' + this.settings.index + ' not created, since it already exists.' );
                } else {
                    log.error( 'Error occurred creating index', err );
                }
            }
            else this.addMapping( this.settings.index, this.settings.indexType, mapping );
        } );
    }

    /**
     * Add the specified mapping to an index and type.
     *
     * @param {string} index
     * @param {string} type
     * @param {object} mapping
     */
    addMapping(index, type, mapping) {
        this.client.indices.putMapping( {
            index: index,
            type: type,
            body: mapping
        }, err => {
            if (err) log.error( 'Error occurred adding mapping', err );
        } );
    }

    /**
     * Index data in batches
     * @param {object} data
     * @param {boolean} closeAfterBulk
     */
    bulk(data, closeAfterBulk) {
        this.client.bulk( {
            index: this.settings.index,
            type: this.settings.indexType,
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
     */
    addDocToBulk(doc, id) {
        this._bulkData.push( {index: {_id: id}} );
        this._bulkData.push( doc );

        // send data to elasticsearch if limit is reached
        // TODO: don't use document size but bytes instead
        if (this._bulkData.length > this.maxBulkSize) {
            this.sendBulkData();
        }
    }

    /**
     * Send all collected bulk data if any.
     *
     * @param {boolean=} closeAfterBulk
     */
    sendBulkData(closeAfterBulk) {
        if (this._bulkData.length > 0) {
            log.debug( 'Sending BULK message' );
            this.bulk( this._bulkData, closeAfterBulk );
            this._bulkData = [];
        }
    }
}

module.exports = ElasticSearchUtils;