'use strict';

// let ckanDefaultMapper = require( './server/ckan/ckan.mapper' );
// let ckanIdfMapper = require( './server/ckan/ckan.idf.mapper' );
let excelDefaultMapper = require( './server/excel/excel.mapper' );
let excelIdfMapper = require( './server/excel/excel.idf.mapper' );

module.exports = {
    indexer: [
/*
       {
            importer: 'CKAN',
            elasticSearchUrl: 'http://localhost:9200',
            index: 'govdata',
            indexType: 'transport_verkehr',
            urlSearch: 'https://ckan.govdata.de/api/search/dataset?q=groups:transport_verkehr&limit=10',
            urlData: 'https://www.govdata.de/ckan/api/rest/dataset/',
            mapper: [ ckanDefaultMapper, ckanIdfMapper ]
        },
*/
        {
            importer: 'EXCEL',
            elasticSearchUrl: 'http://localhost:9200',
            index: 'excel',
            indexType: 'base',
            alias: 'mcloud',
            filePath: '', // xlsx-file for import
            mapper: [ excelDefaultMapper, excelIdfMapper ],
            includeTimestamp: true
        }
    ]
};
