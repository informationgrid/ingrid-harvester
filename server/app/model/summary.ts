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

import type { TypedError } from '@shared/job.js';
import type { ImporterSettings } from '../importer/importer.settings.js';
import type { ImportLogMessage } from './import.result.js';

export class Summary {

    private MAX_ITEMS_TO_SHOW = 10;

    numDocs: number = 0;

    numErrors: number = 0;

    warnings: string[][] = [];

    skippedDocs: string[] = [];

    errors: TypedError[] = [];

    counters: Record<string, number> = {};

    isIncremental: boolean;

    readonly stage: string;

    startTime?: Date;

    [x: string]: any;

    increment(key: string, by: number = 1): void {
        this.counters[key] = (this.counters[key] ?? 0) + by;
    }

    private readonly headerTitle: string;

    constructor(stage: string, settings: Partial<ImporterSettings>) {
        this.stage = stage;
        this.headerTitle = `${settings.description} (${settings.type})`;
        if (settings.showCompleteSummaryInfo) {
            this.MAX_ITEMS_TO_SHOW = 1000000;
        }
    }

    print(logger) {
        logger.info(`---------------------------------------------------------`);
        logger.info(this.headerTitle);
        logger.info(`---------------------------------------------------------`);
        logger.info(`Harvest type: ${this.isIncremental ? 'incremental' : 'full'}`);
        logger.info(`Number of records: ${this.numDocs}`);
        logger.info(`Skipped records: ${this.skippedDocs.length}`);
        this.logArray(logger, this.skippedDocs);

        logger.info(`Record-Errors: ${this.numErrors}`);
        logger.info(`Warnings: ${this.warnings.length}`);
        this.logArray(logger, this.warnings);

        const byType = this.errors.reduce((m, e) => {
            m.set(e.type, [...(m.get(e.type) ?? []), e.error]);
            return m;
        }, new Map<string, string[]>());
        for (const [type, msgs] of byType) {
            logger.info(`${type}-Errors: ${msgs.length}`);
            this.logArray(logger, msgs);
        }

        for (const [key, value] of Object.entries(this.counters)) {
            logger.info(`${key}: ${value}`);
        }

        this.additionalSummary();
    }

    toString() : string {
        let result =`---------------------------------------------------------\n`;
        result += this.headerTitle+"\n";
        result += `---------------------------------------------------------\n`;
        result += `Harvest type: ${this.isIncremental ? 'incremental' : 'full'}`;
        result += `Number of records: ${this.numDocs}\n`;
        result += `Skipped records: ${this.skippedDocs.length}\n`;

        result += `Record-Errors: ${this.numErrors}\n`;
        result += `Warnings: ${this.warnings.length}\n`;

        const byType = this.errors.reduce((m, e) => {
            m.set(e.type, (m.get(e.type) ?? 0) + 1);
            return m;
        }, new Map<string, number>());
        for (const [type, count] of byType) {
            result += `${type}-Errors: ${count}\n`;
        }

        for (const [key, value] of Object.entries(this.counters)) {
            result += `${key}: ${value}\n`;
        }

        return result;
    }

    private logArray(logger, list: any) {
        if (logger.isDebugEnabled() && list.length > 0) {
            let listString = `\n\t${list.slice(0, this.MAX_ITEMS_TO_SHOW).join('\n\t')}`;
            if (list.length > this.MAX_ITEMS_TO_SHOW) {
                listString += '\n\t...';
            }
            logger.debug(listString);
        }
    }

    additionalSummary() {
    }

    msgImport(message: string): ImportLogMessage {
        return {
            stage: this.stage,
            complete: false,
            message: message
        }
    }

    msgRunning(current: number, total: number, message: string): ImportLogMessage {
        return {
            stage: this.stage,
            complete: false,
            progress: {
                current: current,
                total: total
            },
            message: message
        };
    }

    msgComplete(message?: string): ImportLogMessage {
        return {
            stage: this.stage,
            complete: true,
            summary: this,
            message: message ?? undefined
        };
    }
}
