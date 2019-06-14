import {ExcelImporter, ExcelSettings} from './importer/excel/excel.importer';
import {CkanImporter, CkanSettings} from "./importer/ckan/ckan.importer";
import {BfgImporter} from "./importer/csw/bfg.importer";
import {Summary} from "./model/summary";
import * as fs from "fs";
import {CodedeImporter} from "./importer/csw/codede.importer";
import {CswImporter, CswSettings} from "./importer/csw/csw.importer";
import {configure, getLogger} from "log4js";

let config: (CkanSettings | CswSettings | ExcelSettings)[] = require( './config.json' ),
    process = require('process'),
    log = getLogger(),
    logSummary = getLogger('summary'),
    lastExecutionLogFile = './logs/last-execution.log';

// remove log file to only log current execution
if (fs.existsSync(lastExecutionLogFile)) {
    fs.unlinkSync(lastExecutionLogFile);
}

configure('./log4js.json');

const start = new Date();
let runAsync = false;

// create a server which finds a random free port
// scan a range
/*findPort('127.0.0.1', 80, 83, function(ports) {
    console.log(ports);
});*/

// notify chosen port to java process via config file or similar

// listen for incoming messages, which can be "import" with parameter <type>

function getImporter(importerConfig) {
    const type = importerConfig.type;
    if (type === 'CKAN') return new CkanImporter(importerConfig);
    if (type === 'EXCEL') return new ExcelImporter(importerConfig);
    if (type === 'CSW') return new CswImporter(importerConfig);
    if (type === 'BFG-CSW') return new BfgImporter(importerConfig);
    if (type === 'CODEDE-CSW') return new CodedeImporter(importerConfig);
}

function getDateString() {
    let dt = new Date(Date.now());
    let year = dt.getFullYear();
    let month = ('0' + dt.getMonth()).slice(-2);
    let day = ('0' + dt.getDate()).slice(-2);

    return `${year}${month}${day}`;
}

function showSummaries(summaries: Summary[]) {
    const duration = (+new Date() - +start) / 1000;
    logSummary.info('#######################################');
    logSummary.info('Import started at: ' + start);
    logSummary.info('Import took: ' + duration + 's\n');
    summaries.forEach(summary => summary ? summary.print() : '');
    logSummary.info('#######################################');
}

async function startProcess() {

    const processes = [];
    let summaries: Summary[] = [];

    for (let importerConfig of config) {

        // skip disabled importer
        if (importerConfig.disable) continue;

        // Include relevant CLI args
        importerConfig.dryRun = myArgs.includes('-n') || myArgs.includes('--dry-run') || importerConfig.dryRun === true;

        // Set the same elasticsearch alias for deduplication for all importers
        importerConfig.deduplicationAlias = deduplicationAlias;

        let importer = getImporter( importerConfig );
        if (!importer) {
            log.error( 'Importer not defined for: ' + importerConfig.type );
            return;
        }
        log.info("Starting import ...");
        try {
            if (runAsync) {
                processes.push(importer.run());
            } else {
                summaries.push(await importer.run());
            }
        } catch (e) {
            console.error(`Importer ${importerConfig.type} failed: `, e);
        }
    }

    if (runAsync) {
        Promise.all(
            processes.map(p => p.catch(e => console.error('Error for harvester occurred: ', e)))
        ).then( showSummaries );
    } else {
        showSummaries(summaries);
    }

}

// Generate a quasi-random string for a deduplication alias
let pid = process.pid;
let dt = getDateString();
let deduplicationAlias = `dedupe_${dt}_${pid}`;

let myArgs = process.argv.slice(2);
runAsync = myArgs.includes('--async');

startProcess();
