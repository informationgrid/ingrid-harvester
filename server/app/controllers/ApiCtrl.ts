import {Authenticated, BodyParams, Controller, Get, PathParams, Post} from '@tsed/common';
import {ConfigService} from '../services/config/ConfigService';
import {ImportSocketService} from '../sockets/import.socket.service';
import {SummaryService} from '../services/config/SummaryService';
import {ImportLogMessage} from '../model/import.result';
import {LogService} from '../services/storage/LogService';
import {ScheduleService} from '../services/ScheduleService';
import {CronData} from '../importer.settings';
import {UrlCheckService} from "../services/statistic/UrlCheckService";

let log = require('log4js').getLogger(__filename);

@Controller('/api')
@Authenticated()
export class ApiCtrl {
    private importAllProcessIsRunning = false;

    constructor(private importSocketService: ImportSocketService,
                private summaryService: SummaryService,
                private logService: LogService,
                private scheduleService: ScheduleService,
                private urlCheckService: UrlCheckService) {
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

}
