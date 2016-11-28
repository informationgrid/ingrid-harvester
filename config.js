'use strict';

let excelDefaultMapper = require( './server/excel/excel.mapper' );
let excelIdfMapper = require( './server/excel/excel.idf.mapper' );

module.exports = {
    indexer: [
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