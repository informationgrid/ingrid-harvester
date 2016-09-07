'use strict';

/**
 * A mapper for CKAN documents.
 */
class CkanToElasticsearchMapper {

    /**
     * Maps a document coming from a CKAN instance to an elasticsearch document...
     * @param {object} doc
     * @returns {object} - the mapped document.
     */
    map(doc) {
        /*let result = {};

        result.id = doc.id;
        result.title = doc.title;*/
        return doc;
    }
}

module.exports = new CkanToElasticsearchMapper();