/**
 * A mapper for CKAN documents.
 */
export class CkanToElasticsearchMapper {

    /**
     * Maps a document coming from a CKAN instance to an elasticsearch document...
     * @param {object} source - Contains the whole source document in ckan format
     * @param {object} doc - is a reference to the elasticsearch document, which will be mapped here
     */
    run(source, doc) {

        // just extend the document with all fields from the source
        Object.assign( doc, source );
    }
}
