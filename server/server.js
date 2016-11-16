'use strict';

var // findPort = require( 'find-port' ),
    log = require( 'log4js' ).getLogger( __filename ),
    config = require( '../config' ),
    GovDataImporter = require( './ckan/importer' ),
    ExcelImporter = require( './excel/importer' );

// create a server which finds a random free port
// scan a range
/*findPort('127.0.0.1', 80, 83, function(ports) {
    console.log(ports);
});*/

// notify chosen port to java process via config file or similar

// listen for incoming messages, which can be "import" with parameter <type>

function getImporter(type) {
    if (type === 'CKAN') return GovDataImporter;
    if (type === 'EXCEL') return ExcelImporter;
}

config.indexer.forEach( settings => {
    // TODO: choose different importer depending on setting
    let importerClass = getImporter( settings.importer );
    if (!importerClass) {
        log.error( 'Importer not defined for: ' + settings.importer );
        return;
    }

    let importer = new importerClass( settings );
    importer.run();
} );
