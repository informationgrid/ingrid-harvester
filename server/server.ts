import {ExcelImporter} from './excel/importer';
import {DeutscheBahnCkanImporter} from "./ckan/importer";
import {WsvImporter} from "./csw/wsv-importer";
import {DwdImporter} from "./csw/dwd-importer";
import {BfgImporter} from "./csw/bfg-importer";
import {MdiImporter} from "./csw/mdi-importer";
import {CkanToElasticsearchMapper} from "./ckan/ckan.mapper";

let // findPort = require( 'find-port' ),
    log = require( 'log4js' ).getLogger( __filename ),
    config = require( './config.json' ),
    process = require('process');


// create a server which finds a random free port
// scan a range
/*findPort('127.0.0.1', 80, 83, function(ports) {
    console.log(ports);
});*/

// notify chosen port to java process via config file or similar

// listen for incoming messages, which can be "import" with parameter <type>

function getImporter(settings) {
    const type = settings.importer;
    if (type === 'CKAN-DB') return new DeutscheBahnCkanImporter(settings);
    if (type === 'EXCEL') return new ExcelImporter(settings);
    if (type === 'WSV-CSW') return new WsvImporter(settings);
    if (type === 'DWD-CSW') return new DwdImporter(settings);
    if (type === 'BFG-CSW') return new BfgImporter(settings);
    if (type === 'MDI-CSW') return new MdiImporter(settings);
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

config.forEach( (settings:any) => {
    // Include relevant CLI args
    settings.dryRun = args.includes('-n') || args.includes('--dry-run');
    settings.printSummary = args.includes('--print-summary');

    // Set the same elasticsearch alias for deduplication for all importers
    settings.deduplicationAlias = deduplicationAlias;

    let importer = getImporter( settings );
    if (!importer) {
        log.error( 'Importer not defined for: ' + settings.importer );
        return;
    }

    importer.run();
} );
