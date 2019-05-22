import {ExcelImporter} from './excel/importer';
import {DeutscheBahnCkanImporter} from "./ckan/importer";
import {WsvImporter} from "./csw/wsv-importer";
import {DwdImporter} from "./csw/dwd-importer";
import {BfgImporter} from "./csw/bfg-importer";
import {MdiImporter} from "./csw/mdi-importer";
import {configure, getLogger} from 'log4js';
import {Summary} from "./model/summary";
import * as fs from "fs";
import {BshImporter} from "./csw/bsh-importer";
import {CodeDeImporter} from "./csw/codede-importer";

let config = require( './config.json' ),
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

function getImporter(settings) {
    const type = settings.importer;
    if (type === 'CKAN-DB') return new DeutscheBahnCkanImporter(settings);
    if (type === 'EXCEL') return new ExcelImporter(settings);
    if (type === 'WSV-CSW') return new WsvImporter(settings);
    if (type === 'DWD-CSW') return new DwdImporter(settings);
    if (type === 'BFG-CSW') return new BfgImporter(settings);
    if (type === 'MDI-CSW') return new MdiImporter(settings);
    if (type === 'BSH-CSW') return new BshImporter(settings);
    if (type === 'CODEDE-CSW') return new CodeDeImporter(settings);
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

    for (let settings of config) {
        // Include relevant CLI args
        settings.dryRun = args.includes('-n') || args.includes('--dry-run') || settings.dryRun === true;

        // Set the same elasticsearch alias for deduplication for all importers
        settings.deduplicationAlias = deduplicationAlias;

        let importer = getImporter( settings );
        if (!importer) {
            log.error( 'Importer not defined for: ' + settings.importer );
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
            console.error(`Importer ${settings.importer} failed: `, e);
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

let args = process.argv.slice(2);
runAsync = args.includes('--async');

startProcess();
