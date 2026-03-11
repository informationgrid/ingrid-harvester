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

import { type Logger, getLogger } from 'log4js';
import type {ImporterSettings} from '../importer.settings.js';

export class Summary {

    private MAX_ITEMS_TO_SHOW = 10;

    numDocs: number = 0;

    numErrors: number = 0;

    warnings: string[][] = [];

    skippedDocs: string[] = [];

    elasticErrors: string[] = [];

    databaseErrors: string[] = [];

    appErrors: string[] = [];

    isIncremental: boolean;

    [x: string]: any;

    private readonly headerTitle: string;

    public readonly log: Logger;

    constructor(settings: Partial<ImporterSettings>) {
        this.headerTitle = `${settings.description} (${settings.type})`;
        if (settings.showCompleteSummaryInfo) {
            this.MAX_ITEMS_TO_SHOW = 1000000;
        }
        this.isIncremental = settings.isIncremental;
        this.log = getLogger(settings.description || 'Summary');
    }

    print() {
        this.info(`---------------------------------------------------------`);
        this.info(this.headerTitle);
        this.info(`---------------------------------------------------------`);
        this.info(`Harvest type: ${this.isIncremental ? 'incremental' : 'full'}`);
        this.info(`Number of records: ${this.numDocs}`);
        this.info(`Skipped records: ${this.skippedDocs.length}`);
        this.logArray(this.skippedDocs);

        this.info(`Record-Errors: ${this.numErrors}`);
        this.info(`Warnings: ${this.warnings.length}`);
        this.logArray(this.warnings);

        this.info(`App-Errors: ${this.appErrors.length}`);
        this.logArray(this.appErrors);

        this.info(`Database-Errors: ${this.databaseErrors.length}`);
        this.logArray(this.databaseErrors);

        this.info(`Elasticsearch-Errors: ${this.elasticErrors.length}`);
        this.logArray(this.elasticErrors);

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

        result += `App-Errors: ${this.appErrors.length}\n`;

        result += `Database-Errors: ${this.databaseErrors.length}\n`;

        result += `Elasticsearch-Errors: ${this.elasticErrors.length}\n`;

        return result;
    }

    private logArray(list: any) {
        if (this.log.isDebugEnabled() && list.length > 0) {
            let listString = `\n\t${list.slice(0, this.MAX_ITEMS_TO_SHOW).join('\n\t')}`;
            if (list.length > this.MAX_ITEMS_TO_SHOW) {
                listString += '\n\t...';
            }
            this.debug(listString);
        }
    }

    additionalSummary() {
    }

    debug(message: any, ...args: any[]): void {
        this.log.debug(message, args);
    }

    info(message: any, ...args: any[]): void{
        this.log.info(message, args);
    }

    warn(message: any, ...args: any[]): void{
        this.log.warn(message, args);
    }

    error(message: any, ...args: any[]): void{
        this.log.error(message, args);
    }
}
