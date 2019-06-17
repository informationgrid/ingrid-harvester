import {BodyParams, Controller, Get, PathParams, Post} from '@tsed/common';
import {Harvester} from '../../client/src/app/harvester/model/harvester';
import {ConfigService} from '../services/config/ConfigService';
import {ExcelImporter} from '../importer/excel/excel.importer';
import {ImportSocketService} from "../sockets/import.socket.service";

@Controller("/api")
export class ApiCtrl {

    constructor(private importSocketService: ImportSocketService) {
    }

    @Get("/harvester")
    // @Authenticated()
    async getHarvesterConfig(): Promise<Harvester[]> {
        return ConfigService.get();
    }

    @Post("/harvester/:id")
    updateHarvesterConfig(@PathParams('id') id: number, @BodyParams('config') config: Harvester) {
        ConfigService.update(id, config);
    }

    @Post("/import/:id")
    importFromHarvester(@PathParams('id') id: number, @BodyParams('config') config: Harvester) {
        this.importSocketService.runImport(id);

        /*let configData = ConfigService.get().filter(config => config.id === id)[0];
        // FIXME: deduplication must work differently when import is not started for all harvesters
        configData.deduplicationAlias = configData.index + 'dedup';
        new ExcelImporter(configData).run.subscribe( response => {
            if (response.complete) {
                response.summary.print();
            }
        }, error => {
            console.error('There was an error:', error);
        });*/
    }
}
