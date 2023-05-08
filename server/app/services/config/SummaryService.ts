/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
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

import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'fs';
import {ImportLogMessage} from '../../model/import.result';
import {Service} from '@tsed/di';
import {CronJob} from 'cron';
import {ConfigService} from './ConfigService';

/**
 * This service handles access to a file which contains the last import summary
 * of each harvester. This is used to display as an information about the last
 * import process.
 */
@Service()
export class SummaryService {
    private summaries: ImportLogMessage[] = [];
    private summaryPath = 'data/importLogSummaries.json';

    constructor() {

        if (existsSync(this.summaryPath)) {
            let summaryFile = readFileSync(this.summaryPath);
            this.summaries = JSON.parse(summaryFile.toString());
        } else {
            if (!existsSync('data')) mkdirSync('data');

            writeFileSync(this.summaryPath, '[]');
            this.summaries = [];
        }

    }

    /**
     * Get the last import summary of the harvester with the given ID
     * @param id is the ID the harvester is identified with
     */
    get(id: number): ImportLogMessage {
        return this.summaries.find(s => s.id === id);
    }

    /**
     * Get all import summaries from each harvester.
     */
    getAll(): ImportLogMessage[] {
        let harvesters = ConfigService.get();

        return this.summaries
            .map(summary => {
                let harvester = harvesters.find(h => h.id === summary.id);
                // for (let mode of <('full' | 'incr')[]>['full', 'incr']) {
                    let mode = summary.summary.isIncremental ? 'incr' : 'full';
                    if (harvester?.cron?.[mode]?.active) {
                        let cronJob = new CronJob(harvester.cron[mode].pattern, () => {}, null, false);
                        summary.nextExecution = cronJob.nextDate().toDate();
                    } else {
                        summary.nextExecution = null;
                    }
                    return summary;
                // }
            } );
    }

    /**
     * Update the json file containing all last import summaries of the harvesters
     * by replacing or adding the given summary.
     * @param summary
     */
    update(summary: ImportLogMessage): void {
        let position = this.summaries.findIndex(s => s.id === summary.id);

        // add summary to the end if it was not found, otherwise overwrite it
        if (position === -1) {
            this.summaries.push(summary);
        } else {
            this.summaries[position] = summary;
        }

        writeFileSync(this.summaryPath, JSON.stringify(this.summaries, null, 2));
    }
}
