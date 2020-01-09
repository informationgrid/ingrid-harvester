import {Authenticated, BodyParams, Controller, Delete, Get, PathParams, Post} from '@tsed/common';
import {Harvester} from '@shared/harvester';
import {ConfigService} from '../services/config/ConfigService';
import {ImportSocketService} from "../sockets/import.socket.service";
import {SummaryService} from '../services/config/SummaryService';
import {ImportLogMessage} from '../model/import.result';
import {LogService} from '../services/storage/LogService';
import {ScheduleService} from '../services/ScheduleService';
import {Index} from '@shared/index.model';
import {IndexService} from '../services/IndexService';
import {CronData} from '../importer.settings';

let log = require('log4js').getLogger(__filename);

@Controller("/api")
@Authenticated()
export class ApiCtrl {
    private importAllProcessIsRunning = false;

    constructor(private importSocketService: ImportSocketService,
                private summaryService: SummaryService,
                private logService: LogService,
                private indexService: IndexService,
                private scheduleService: ScheduleService) {
    }

    @Get("/harvester")
    async getHarvesterConfig(): Promise<Harvester[]> {
        return ConfigService.get();
    }

    @Post("/harvester/:id")
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

    @Delete("/harvester/:id")
    deleteHarvesterConfig(@PathParams('id') id: number) {

        // remove from search index/alias
        this.indexService.removeFromAlias(+id);

        // update config without the selected harvester
        const filtered = ConfigService.get()
            .filter( harvester => harvester.id !== +id);

        ConfigService.updateAll(filtered);

        // remove from scheduler
        this.scheduleService.stopJob(+id);

    }

    @Post("/import/:id")
    importFromHarvester(@PathParams('id') id: number) {
        this.importSocketService.runImport(+id);
    }

    @Post("/importAll")
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


    @Get('/indices')
    async getIndices(): Promise<Index[]> {

        return this.indexService.getIndices();

    }

    @Delete('/indices/:name')
    async deleteIndex(@PathParams('name') name: string): Promise<void> {

        return this.indexService.deleteIndex(name);

    }
}
