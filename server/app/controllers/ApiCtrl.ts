import {BodyParams, Controller, Get, PathParams, Post} from '@tsed/common';
import {Harvester} from '../../../client/src/app/harvester/model/harvester';
import {ConfigService} from '../services/config/ConfigService';
import {ImportSocketService} from "../sockets/import.socket.service";
import {SummaryService} from '../services/config/SummaryService';
import {ImportLogMessage} from '../model/import.result';
import {LogService} from '../services/storage/LogService';
import {ScheduleService} from '../services/ScheduleService';
import {GeneralSettings} from '../../../shared/general-config.settings';

@Controller("/api")
export class ApiCtrl {

    constructor(private importSocketService: ImportSocketService,
                private summaryService: SummaryService,
                private logService: LogService,
                private scheduleService: ScheduleService) {
    }

    @Get("/harvester")
    // @Authenticated()
    async getHarvesterConfig(): Promise<Harvester[]> {
        return ConfigService.get();
    }

    @Post("/harvester/:id")
    updateHarvesterConfig(@PathParams('id') id: number, @BodyParams() config: Harvester) {
        ConfigService.update(+id, config);

        if (config.disable) {
            this.scheduleService.stopJob(+id);
        } else {
            this.scheduleService.startJob(+id);
        }
    }

    @Post("/import/:id")
    importFromHarvester(@PathParams('id') id: number) {
        this.importSocketService.runImport(+id);
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
    schedule(@PathParams('id') id: number, @BodyParams('cron') cronExpression: string): void {
        console.log('Body:', cronExpression);
        this.scheduleService.set(+id, cronExpression);
    }


    @Get('/config/general')
    getGeneralConfig(): GeneralSettings {
        let aHarvester = ConfigService.get()[0];
        return {
            elasticSearchUrl: aHarvester.elasticSearchUrl,
            alias: aHarvester.alias,
            proxy: aHarvester.proxy
        };
    }

    @Post('/config/general')
    setGeneralConfig(@BodyParams() body: GeneralSettings): void {
        console.log('Body:', body);
        let updatedHarvesters = ConfigService.get()
            .map(config => {
                config.elasticSearchUrl = body.elasticSearchUrl;
                config.alias = body.alias;
                config.proxy = body.proxy;
                return config;
            });

        ConfigService.updateAll(updatedHarvesters);
    }
}
