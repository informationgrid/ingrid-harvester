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

import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'fs';
import type {ImportLogMessage} from '../../model/import.result.js';
import {Service} from '@tsed/di';
import {CronJob} from 'cron';
import {ConfigService} from './ConfigService.js';

/**
 * This service handles access to a file which contains the last import summary
 * of each harvester. This is used to display as an information about the last
 * import process.
 */
@Service()
export class SummaryService {
    private summaries: ImportLogMessage[] = [];
    private summaryPath = 'data/importLogSummaries.json';
    private liveStates = new Map<number, ImportLogMessage>();

    constructor() {

        if (existsSync(this.summaryPath)) {
            let summaryFile = readFileSync(this.summaryPath);
            if (summaryFile.toString().trim().length > 0){
                this.summaries = JSON.parse(summaryFile.toString());
            }
        } else {
            if (!existsSync('data')) mkdirSync('data');

            writeFileSync(this.summaryPath, '[]');
            this.summaries = [];
        }

    }

    setLiveState(id: number, msg: ImportLogMessage): void {
        this.liveStates.set(id, msg);
    }

    clearLiveState(id: number): void {
        this.liveStates.delete(id);
    }

    getLiveStates(): ImportLogMessage[] {
        return [...this.liveStates.values()];
    }

    /** Set live in-progress state: updates live states AND in-memory summaries. */
    setInProgress(msg: ImportLogMessage): void {
        this.liveStates.set(msg.id, msg);
        this.update(msg);
    }

    /** Remove all traces of an import that ended without a result (error / abort). */
    clearImport(id: number): void {
        this.liveStates.delete(id);
        this.delete(id);
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
        let harvesters = ConfigService.getHarvesters();
        const liveStateIds = new Set(this.liveStates.keys());

        const persistedResult = this.summaries
            .filter(s => !liveStateIds.has(s.id))
            .map(summary => {
                let harvester = harvesters.find(h => h.id === summary.id);
                if (summary.summary) {
                    let mode = summary.summary.isIncremental ? 'incr' : 'full';
                    if (harvester?.cron?.[mode]?.active) {
                        let cronJob = new CronJob(harvester.cron[mode].pattern, () => {}, null, false);
                        summary.nextExecution = cronJob.nextDate().toDate();
                    } else {
                        summary.nextExecution = null;
                    }
                }
                return summary;
            });
        return [...persistedResult, ...this.liveStates.values()];
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

        // only persist completed runs to disk; in-progress status lives in memory only
        if (summary.complete) {
            writeFileSync(this.summaryPath, JSON.stringify(
                this.summaries.filter(s => s.complete),
                null, 2
            ));
        }
    }

    delete(id: number): void {
        const position = this.summaries.findIndex(s => s.id === id);
        if (position !== -1) this.summaries.splice(position, 1);
    }
}
