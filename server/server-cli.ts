import {Summary} from './model/summary';
import * as fs from 'fs';
import {configure, getLogger} from 'log4js';
import {concat, Observable} from 'rxjs';
import {ImportLogMessage} from './model/import.result';
import {ImporterFactory} from "./importer/importer.factory";
import {CkanSettings} from './importer/ckan/ckan.settings';
import {CswSettings} from './importer/csw/csw.settings';
import {ExcelSettings} from './importer/excel/excel.settings';

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
    summaries.forEach(summary => summary ? summary.print(logSummary) : '');
    logSummary.info('#######################################');
}

async function startProcess() {

    const processes = [];
    let summaries: Summary[] = [];
    let importers: Observable<ImportLogMessage>[] = [];

    for (let importerConfig of config) {

        // skip disabled importer
        if (importerConfig.disable) continue;

        // Include relevant CLI args
        importerConfig.dryRun = myArgs.includes('-n') || myArgs.includes('--dry-run') || importerConfig.dryRun === true;

        // Set the same elasticsearch alias for deduplication for all importers
        importerConfig.deduplicationAlias = deduplicationAlias;

        let importer = ImporterFactory.get( importerConfig );
        if (!importer) {
            log.error( 'Importer not defined for: ' + importerConfig.type );
            return;
        }
        log.info("Starting import ...");
        try {
            if (runAsync) {
                processes.push(importer.run.toPromise());
            } else {
                importers.push(importer.run);
                //summaries.push(await importer.run.subscribe());
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
        let summaries: Summary[] = [];
        concat(...importers).subscribe( result => {
            result.complete ? summaries.push(result.summary) : console.log(result.progress);
            // showSummaries(summaries);
        }).add( () => {
            summaries.forEach( summary => summary.print(logSummary))
        });

    }

}

// Generate a quasi-random string for a deduplication alias
let pid = process.pid;
let dt = getDateString();
let deduplicationAlias = `dedupe_${dt}_${pid}`;

let myArgs = process.argv.slice(2);
runAsync = false; //myArgs.includes('--async');

startProcess();
