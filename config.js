var ckanDefaultMapper = require( './server/ckan/ckan.mapper' );
var ckanIdfMapper = require( './server/ckan/ckan.idf.mapper' );
var excelDefaultMapper = require( './server/excel/excel.mapper' );
var excelIdfMapper = require( './server/excel/excel.idf.mapper' );

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
            indexType: 'transport_verkehr',
            alias: 'mcloud',
            filePath: 'C:\\Users\\ingrid\\Desktop\\FinaleImportExcel_v8.xlsx',
            mapper: [ excelDefaultMapper, excelIdfMapper ],
            includeTimestamp: true
        }
    ]
};
