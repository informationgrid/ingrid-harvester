/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2021 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  http://ec.europa.eu/idabc/eupl5
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

import {Authenticated, BodyParams, Controller, Get, PathParams, Post} from '@tsed/common';
import {ConfigService} from '../services/config/ConfigService';
import {ImportSocketService} from '../sockets/import.socket.service';
import {SummaryService} from '../services/config/SummaryService';
import {ImportLogMessage} from '../model/import.result';
import {LogService} from '../services/storage/LogService';
import {ScheduleService} from '../services/ScheduleService';
import {CronData} from '../importer.settings';
import {UrlCheckService} from "../services/statistic/UrlCheckService";
import {IndexCheckService} from "../services/statistic/IndexCheckService";

let log = require('log4js').getLogger(__filename);

@Controller('/api')
@Authenticated()
export class ApiCtrl {
    private importAllProcessIsRunning = false;

    constructor(private importSocketService: ImportSocketService,
                private summaryService: SummaryService,
                private logService: LogService,
                private scheduleService: ScheduleService,
                private urlCheckService: UrlCheckService,
                private indexCheckService: IndexCheckService) {
    }

    @Post('/import/:id')
    importFromHarvester(@PathParams('id') id: number) {
        this.importSocketService.runImport(+id);
    }

    @Post('/importAll')
    async importAllFromHarvester() {
        if (!this.importAllProcessIsRunning) {
            this.importAllProcessIsRunning = true;

            let activeConfigs = ConfigService.get()
                .filter(config => !config.disable);

            for (var i = 0; i < activeConfigs.length; i++) {
                await this.importSocketService.runImport(activeConfigs[i].id);
            }

            this.importAllProcessIsRunning = false;
        }
    }

    @Get('/lastLogs')
    getLastLogs(): ImportLogMessage[] {
        return this.summaryService.getAll();
    }

    @Get('/log')
    getLog(): string {
        return this.logService.get();
    }

    @Post('/schedule/:id')
    schedule(@PathParams('id') id: number, @BodyParams('cron') cronExpression: CronData): Date {
        console.log('Body:', cronExpression);
        return this.scheduleService.set(+id, cronExpression);
    }

    @Post('/url_check')
    async checkURLs() {
        this.urlCheckService.start();
    }



    @Post('/index_check')
    async checkIndices() {
        this.indexCheckService.start();
    }

}
