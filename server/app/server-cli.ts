/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2024 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or - as soon they will be
 * approved by the European Commission - subsequent versions of the
 * EUPL (the "Licence");
 *
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the Licence is distributed on an "AS IS" basis,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and
 * limitations under the Licence.
 * ==================================================
 */

import { addLayout, configure, getLogger } from 'log4js';
import { concat, Observable } from 'rxjs';
import { jsonLayout } from './utils/log4js.json.layout';
import { merge } from './utils/misc.utils';
import { ConfigService } from './services/config/ConfigService';
import { ImportLogMessage } from './model/import.result';
import { ProfileFactoryLoader} from './profiles/profile.factory.loader';
import { Summary } from './model/summary';

let config = ConfigService.get(),
    configGeneral = ConfigService.getGeneralSettings(),
    process = require('process'),
    log = getLogger(),
    logSummary = getLogger('summary');

addLayout("json", jsonLayout);
const isDev = process.env.NODE_ENV != 'production';
configure(`./log4js${isDev ? '-dev' : ''}.json`);

const start = new Date();
let runAsync = false;

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
    // let summaries: Summary[] = [];
    let importers: Observable<ImportLogMessage>[] = [];

    for (let importerConfig of config) {

        // skip disabled importer
        if (importerConfig.disable) continue;

        // Include relevant CLI args
        importerConfig.dryRun = myArgs.includes('-n') || myArgs.includes('--dry-run') || importerConfig.dryRun === true;

        let configHarvester = merge(importerConfig, configGeneral);

        let profile = ProfileFactoryLoader.get();
        let importer = await profile.getImporterFactory().get(configHarvester);
        if (!importer) {
            log.error( 'Importer not defined for: ' + configHarvester.type );
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
            log.error(`Importer ${configHarvester.type} failed: `, e);
        }
    }

    if (runAsync) {
        Promise.all(
            processes.map(p => p.catch(e => log.error('Error for harvester occurred: ', e)))
        ).then( showSummaries );
    } else {
        let summaries: Summary[] = [];
        concat(...importers).subscribe( result => {
            result.complete ? summaries.push(result.summary) : log.info(result.progress);
            // showSummaries(summaries);
        }).add( () => {
            summaries.forEach( summary => summary.print(logSummary))
        });

    }

}

let myArgs = process.argv.slice(2);
runAsync = false; //myArgs.includes('--async');

startProcess();
