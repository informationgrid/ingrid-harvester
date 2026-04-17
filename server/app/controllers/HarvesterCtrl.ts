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

import type { Datasource } from '@shared/datasource.js';
import { BodyParams, Controller, Delete, Get, PathParams, Post, UseAuth } from '@tsed/common';
import log4js from 'log4js';
import { KeycloakAuth } from "../decorators/KeycloakAuthOptions.js";
import { AuthMiddleware } from '../middlewares/auth/AuthMiddleware.js';
import { ConfigService } from '../services/config/ConfigService.js';
import { ScheduleService } from '../services/ScheduleService.js';
import { HistoryService } from '../services/statistic/HistoryService.js';
import { JobsService } from '../services/statistic/JobsService.js';

const log = log4js.getLogger(import.meta.filename);

@Controller('/api/harvester')
@UseAuth(AuthMiddleware)
@KeycloakAuth({role: ["admin", "editor", "viewer"]})
export class HarvesterCtrl {

    constructor(
        private scheduleService: ScheduleService,
        private historyService: HistoryService,
        private jobsService: JobsService) {
    }

    @Get('/')
    async getHarvesterConfig(): Promise<Datasource[]> {
        return ConfigService.getHarvesters();
    }

    @Post('/filecontent')
    @KeycloakAuth({role: ["admin", "editor"]})
    importHarvesterConfigs(@BodyParams() config: Datasource[]) {
        if(config && config.length > 0 && config[0].type)
            ConfigService.importHarvester(config);
    }

    @Post('/:id')
    @KeycloakAuth({role: ["admin", "editor"]})
    updateHarvesterConfig(@PathParams('id') id: number, @BodyParams() config: Datasource) {
        const updatedID = ConfigService.update(+id, config);
        for (const mode of <('full' | 'incr')[]>['full', 'incr']) {
            if (config.disable || !config.cron?.[mode]?.active) {
                this.scheduleService.stopJob(updatedID, mode);
            }
            else {
                this.scheduleService.startJob(updatedID, mode);
            }
        }
    }

    @Delete('/:id')
    @KeycloakAuth({role: ["admin", "editor"]})
    deleteHarvesterConfig(@PathParams('id') id: number) {

        // // remove from search index/alias
        // this.indexService.removeFromAlias(+id);
        // this.indexService.deleteIndexFromHarvester(+id);

        // remove jobs from scheduler
        this.scheduleService.stopJob(+id, 'full');
        this.scheduleService.stopJob(+id, 'incr');

        // update config without the selected harvester
        const filtered = ConfigService.getHarvesters()
            .filter(harvester => harvester.id !== +id);

        ConfigService.updateAll(filtered);

    }

    @Get('/history/:id')
    async getHarvesterHistory(@PathParams('id') id: number): Promise<any[]> {
        return await this.historyService.getHistory(id);
    }

    @Get('/jobs/:id')
    async getHarvesterJobs(@PathParams('id') id: number): Promise<any> {
        return await this.jobsService.getJobs(id);
    }
}
