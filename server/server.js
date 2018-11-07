'use strict';

let // findPort = require( 'find-port' ),
    log = require( 'log4js' ).getLogger( __filename ),
    config = require( './config.json' ),
    process = require('process'),
    excelDefaultMapper = require( './excel/excel.mapper' ),
    excelIdfMapper = require( './excel/excel.idf.mapper' ),
    ckanDefaultMapper = require( './ckan/ckan.mapper' ),
    ckanIdfMapper = require( './ckan/ckan.idf.mapper' ),
    DeutscheBahnCkanImporter = require( './ckan/importer' ),
    WsvCswImporter = require( './csw/wsv-importer' ),
    DwdCswImporter = require( './csw/dwd-importer' ),
    MdiCswImporter = require( './csw/mdi-importer' ),
    ExcelImporter = require( './excel/importer' );

// create a server which finds a random free port
// scan a range
/*findPort('127.0.0.1', 80, 83, function(ports) {
    console.log(ports);
});*/

// notify chosen port to java process via config file or similar

// listen for incoming messages, which can be "import" with parameter <type>

function getImporter(type) {
    if (type === 'CKAN-DB') return DeutscheBahnCkanImporter;
    if (type === 'EXCEL') return ExcelImporter;
    if (type === 'WSV-CSW') return WsvCswImporter;
    if (type === 'DWD-CSW') return DwdCswImporter;
    if (type === 'MDI-CSW') return MdiCswImporter;
}

function getDateString() {
    let dt = new Date(Date.now());
    let year = dt.getFullYear();
    let month = ('0' + dt.getMonth()).slice(-2);
    let day = ('0' + dt.getDate()).slice(-2);

    return `${year}${month}${day}`;
}

// Generate a quasi-random string for a deduplication alias
let pid = process.pid;
let dt = getDateString();
let deduplicationAlias = `dedupe_${dt}_${pid}`;

let args = process.argv.slice(2);

config.forEach( settings => {
    // Include relevant CLI args
    settings.dryRun = args.includes('-n') || args.includes('--dry-run');

    // Set the same elasticsearch alias for deduplication for all importers
    settings.deduplicationAlias = deduplicationAlias;

    // choose different importer depending on setting
    if (settings.importer === 'EXCEL') {
        settings.mapper = [ excelDefaultMapper, excelIdfMapper ];
    } else if (settings.importer === 'CKAN-DB') {
        settings.mapper = [ ckanDefaultMapper, ckanIdfMapper ];
    }

    let importerClass = getImporter( settings.importer );
    if (!importerClass) {
        log.error( 'Importer not defined for: ' + settings.importer );
        return;
    }

    let importer = new importerClass( settings );
    importer.run();
} );
