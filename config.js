var ckanDefaultMapper = require( './server/ckan/ckan.mapper' );
var ckanIdfMapper = require( './server/ckan/ckan.idf.mapper' );

module.exports = {
    indexer: [
        {
            importer: 'CKAN',
            elasticSearchUrl: 'http://localhost:9200',
            index: 'govdata',
            indexType: 'transport_verkehr',
            urlSearch: 'https://ckan.govdata.de/api/search/dataset?q=groups:transport_verkehr&limit=1000',
            urlData: 'https://www.govdata.de/ckan/api/rest/dataset/',
            mapper: [ ckanDefaultMapper, ckanIdfMapper ]
        }
    ]
};