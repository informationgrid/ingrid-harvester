/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or – as soon they will be
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

import {Authenticated, BodyParams, Controller, Delete, Get, PathParams, Post} from '@tsed/common';
import {ConfigService} from '../services/config/ConfigService';
import {IndexService} from '../services/IndexService';
import {ScheduleService} from '../services/ScheduleService';
import {HistoryService} from '../services/statistic/HistoryService';
import {Harvester} from '@shared/harvester';

let log = require('log4js').getLogger(__filename);

@Controller('/api/harvester')
@Authenticated()
export class HarvesterCtrl {

    constructor(
        private indexService: IndexService,
        private scheduleService: ScheduleService,
        private historyService: HistoryService) {
    }

    @Get('/')
    async getHarvesterConfig(): Promise<Harvester[]> {
        return ConfigService.get();
    }

    @Post('/filecontent')
    importHarvesterConfigs(@BodyParams() config: Harvester[]) {
        if(config && config.length > 0 && config[0].type)
            ConfigService.importHarvester(config);
    }

    @Post('/:id')
    updateHarvesterConfig(@PathParams('id') id: number, @BodyParams() config: Harvester) {
        const updatedID = ConfigService.update(+id, config);

        let mode: 'full' | 'incr' = config.isIncremental ? 'incr' : 'full';
        if (config.disable) {
            this.scheduleService.stopJob(updatedID, mode);
            this.indexService.removeFromAlias(updatedID)
                .catch(e => log.error('Error removing alias', e));
        } else {
            if (config.cron?.[mode]?.active) {
                this.scheduleService.startJob(updatedID, mode);
            }

            this.indexService.addToAlias(updatedID)
                .catch(e => log.error('Error adding alias', e));
        }
    }

    @Delete('/:id')
    deleteHarvesterConfig(@PathParams('id') id: number) {

        // remove from search index/alias
        this.indexService.removeFromAlias(+id);
        this.indexService.deleteIndexFromHarvester(+id);

        // remove jobs from scheduler
        this.scheduleService.stopJob(+id, 'full');
        this.scheduleService.stopJob(+id, 'incr');

        // update config without the selected harvester
        const filtered = ConfigService.get()
            .filter(harvester => harvester.id !== +id);

        ConfigService.updateAll(filtered);

    }

    @Get('/history/:id')
    async getHarvesterHistory(@PathParams('id') id: number): Promise<any[]> {
        return await this.historyService.getHistory(id);
    }
}
