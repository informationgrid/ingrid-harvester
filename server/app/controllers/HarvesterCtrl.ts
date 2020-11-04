import {Authenticated, BodyParams, Controller, Delete, Get, PathParams, Post} from '@tsed/common';
import {ConfigService} from '../services/config/ConfigService';
import {IndexService} from '../services/IndexService';
import {ScheduleService} from '../services/ScheduleService';
import {Harvester} from '@shared/harvester';

let log = require('log4js').getLogger(__filename);

@Controller('/api/harvester')
@Authenticated()
export class HarvesterCtrl {

    constructor(
        private indexService: IndexService,
        private scheduleService: ScheduleService) {
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

        if (config.disable) {
            this.scheduleService.stopJob(updatedID);
            this.indexService.removeFromAlias(updatedID)
                .catch(e => log.error('Error removing alias', e));
        } else {
            if (config.cron && config.cron.active) {
                this.scheduleService.startJob(updatedID);
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

        // remove from scheduler
        this.scheduleService.stopJob(+id);

        // update config without the selected harvester
        const filtered = ConfigService.get()
            .filter(harvester => harvester.id !== +id);

        ConfigService.updateAll(filtered);

    }

    @Get('/history/:id')
    async getHarvesterHistory(@PathParams('id') id: number): Promise<any[]> {
        return await this.indexService.getHistory(id);
    }

}
