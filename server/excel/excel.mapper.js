'use strict';

/**
 * A mapper for EXCEL documents.
 */
class ExcelToElasticsearchMapper {

    /**
     * Maps a document coming from a EXCEL instance to an elasticsearch document...
     * @param {object} source - Contains the whole source document in ogd format
     * @param {object} doc - is a reference to the elasticsearch document, which will be mapped here
     */
    run(source, doc) {

        // just extend the document with all fields from the source
        Object.assign( doc, source );
    }
}

module.exports = new ExcelToElasticsearchMapper();
