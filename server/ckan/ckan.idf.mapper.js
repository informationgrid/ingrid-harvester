'use strict';

/**
 * Converts a document to IDF and adds itself to the document
 */
class CkanIdfMapper {

    /**
     * Maps the document to the IDF format and store it in elasticsearch.
     * @param {object} source - Contains the whole source document in ckan format
     * @param {object} doc - is a reference to the elasticsearch document, which will be mapped here
     */
    run(source, doc) {

        // an example entry to the elasticsearch document
        doc.idf = 'Mein IDF Dokument';
    }
}

module.exports = new CkanIdfMapper();