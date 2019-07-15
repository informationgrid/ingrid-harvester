import {BodyParams, Controller, Get, PathParams, Post} from '@tsed/common';
import {Harvester} from '../../client/src/app/harvester/model/harvester';
import {ConfigService} from '../services/config/ConfigService';
import {ImportSocketService} from "../sockets/import.socket.service";
import {SummaryService} from '../services/config/SummaryService';
import {ImportLogMessage} from '../model/import.result';
import {LogService} from '../services/storage/LogService';

@Controller("/api")
export class ApiCtrl {

    constructor(private importSocketService: ImportSocketService, private summaryService: SummaryService, private logService: LogService) {
    }

    @Get("/harvester")
    // @Authenticated()
    async getHarvesterConfig(): Promise<Harvester[]> {
        return ConfigService.get();
    }

    @Post("/harvester/:id")
    updateHarvesterConfig(@PathParams('id') id: number, @BodyParams() config: Harvester) {
        ConfigService.update(id, config);
    }

    @Post("/import/:id")
    importFromHarvester(@PathParams('id') id: number) {
        this.importSocketService.runImport(id);
    }

    @Get('/lastLogs')
    getLastLogs(): ImportLogMessage[] {
        return this.summaryService.getAll();
    }

    @Get('/log')
    getLog(): string {
        return this.logService.get();
    }
}
