import {BodyParams, Controller, Get, PathParams, Post} from '@tsed/common';
import {Harvester} from '../../client/src/app/harvester/model/harvester';
import {ConfigService} from '../services/config/ConfigService';
import {ExcelImporter} from "../importer/excel/excel.importer";

@Controller("/api")
export class ApiCtrl {

    // constructor(private configService: ConfigService) {}

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
        let configData = ConfigService.get().filter(config => config.id === id);
        new ExcelImporter(configData).run().then( response => response.print());
    }
}
