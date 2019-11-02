import {Authenticated, BodyParams, Controller, Get, PathParams, Post} from '@tsed/common';
import {Harvester} from '../../../client/src/app/harvester/model/harvester';
import {ConfigService} from '../services/config/ConfigService';
import {ImportSocketService} from "../sockets/import.socket.service";
import {SummaryService} from '../services/config/SummaryService';
import {ImportLogMessage} from '../model/import.result';
import {LogService} from '../services/storage/LogService';
import {ScheduleService} from '../services/ScheduleService';
import {GeneralSettings} from '@shared/general-config.settings';
import {IndexService} from '../services/IndexService';

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
        ConfigService.update(+id, config);

        if (config.disable) {
            this.scheduleService.stopJob(+id);
            this.indexService.removeFromAlias(+id);
        } else {
            this.scheduleService.startJob(+id);

            this.indexService.addToAlias(+id);
        }
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
    schedule(@PathParams('id') id: number, @BodyParams('cron') cronExpression: string): void {
        console.log('Body:', cronExpression);
        this.scheduleService.set(+id, cronExpression);
    }


    @Get('/config/general')
    getGeneralConfig(): GeneralSettings {

        return ConfigService.getGeneralSettings();

    }

    @Post('/config/general')
    setGeneralConfig(@BodyParams() body: GeneralSettings): void {

        ConfigService.setGeneralConfig(body);

    }
}
