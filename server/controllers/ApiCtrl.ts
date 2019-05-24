import {BodyParams, Controller, Get, PathParams, Post} from '@tsed/common';
import {Harvester} from '../../client/src/app/harvester/model/harvester';
import {ConfigService} from '../services/config/ConfigService';

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
}
