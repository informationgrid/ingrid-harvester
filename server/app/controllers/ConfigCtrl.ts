import {Authenticated, BodyParams, Controller, Delete, Get, Post, QueryParams} from '@tsed/common';
import {ConfigService} from "../services/config/ConfigService";
import {GeneralSettings} from '@shared/general-config.settings';
import {MappingDistribution, MappingItem} from '@shared/mapping.model';

@Controller("/api/config")
@Authenticated()
export class ConfigCtrl {

    constructor() {
    }

    @Get('/general')
    getGeneralConfig(): GeneralSettings {

        return ConfigService.getGeneralSettings();

    }

    @Post('/general')
    setGeneralConfig(@BodyParams() body: GeneralSettings): void {

        ConfigService.setGeneralConfig(body);

    }

    @Get('/mapping/distribution')
    getMappingDistribution(): MappingDistribution[] {

        return ConfigService.getMappingDistribution();

    }

    @Get('/mapping/filecontent')
    getMappingFile(): any {

        return ConfigService.getMappingFileContent();

    }

    @Post('/mapping/distribution')
    addMappingDistribution(@BodyParams() item: MappingItem): void {

        ConfigService.addMappingDistribution(item);

    }

    @Delete('/mapping/distribution')
    deleteMappingDistribution(
        @QueryParams('source') source: string,
        @QueryParams('target') target: string): void {

        ConfigService.removeMappingDistribution({source, target});

    }

}
