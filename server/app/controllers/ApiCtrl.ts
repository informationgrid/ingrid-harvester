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

import log4js from 'log4js';
import { AuthMiddleware } from '../middlewares/auth/AuthMiddleware.js';
import { BodyParams, Controller, Get, PathParams, Post, QueryParams, UseAuth} from '@tsed/common';
import { ConfigService } from '../services/config/ConfigService.js';
import type { CronData } from '../importer/importer.settings.js';
import type { ImportLogMessage } from '../model/import.result.js';
import { ImportSocketService } from '../sockets/import.socket.service.js';
import { IndexCheckService } from '../services/statistic/IndexCheckService.js';
import { LogService } from '../services/storage/LogService.js';
import { ScheduleService } from '../services/ScheduleService.js';
import { SummaryService } from '../services/config/SummaryService.js';
import { UrlCheckService } from '../services/statistic/UrlCheckService.js';
import {KeycloakAuth} from "../decorators/KeycloakAuthOptions.js";

const log = log4js.getLogger(import.meta.filename);

@Controller('/api')
@UseAuth(AuthMiddleware)
@KeycloakAuth({role: ["admin", "editor", "viewer"]})
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
    @KeycloakAuth({role: ["admin", "editor"]})
    importFromHarvester(@PathParams('id') id: number, @QueryParams('isIncremental') isIncremental: boolean) {
        this.importSocketService.runImport(+id, isIncremental);
    }

    @Post('/importAll')
    @KeycloakAuth({role: ["admin", "editor"]})
    async importAllFromHarvester() {
        if (this.importAllProcessIsRunning) {
            log.info('Import process for all harvesters is already running - not starting again');
        }
        else {
            log.info('Started import process for all harvesters');
            this.importAllProcessIsRunning = true;

            let activeConfigs = ConfigService.getHarvesters().filter(config => !config.disable);

            // TODO do we need priority if harvesters run concurrently?
            // TODO if yes, what does it do?
            // TODO if no, remove field form frontend and backend
            // run higher priority harvesters first (sort descending)
            // activeConfigs.sort((harvesterA, harvesterB) => harvesterB.priority - harvesterA.priority);

            await Promise.all(activeConfigs.map(config => this.importSocketService.runImport(config.id)));

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

    @Get('/log/:harvesterId/:jobId')
    getHarvesterLog(@PathParams('harvesterId') harvesterId: number, @PathParams('jobId') jobId: string): string {
        return this.logService.getHarvesterLog(harvesterId, jobId);
    }

    @Post('/schedule/:id')
    @KeycloakAuth({role: ["admin", "editor"]})
    schedule(@PathParams('id') id: number, @BodyParams('cron') cron: { full: CronData, incr: CronData }): Date[] {
        return this.scheduleService.set(+id, cron);
    }

    @Post('/url_check')
    @KeycloakAuth({role: ["admin", "editor"]})
    async checkURLs() {
        this.urlCheckService.start();
    }

    @Post('/index_check')
    @KeycloakAuth({role: ["admin", "editor"]})
    async checkIndices() {
        this.indexCheckService.start();
    }

}
