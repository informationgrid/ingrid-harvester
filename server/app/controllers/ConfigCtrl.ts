import {Authenticated, BodyParams, Controller, Delete, Get, Post, QueryParams} from '@tsed/common';
import {ConfigService} from "../services/config/ConfigService";
import {GeneralSettings} from '@shared/general-config.settings';
import {MappingDistribution, MappingItem} from '@shared/mapping.model';
import * as fs from "fs";
import {IndexService} from "../services/IndexService";
import {ScheduleService} from "../services/ScheduleService";

@Controller("/api/config")
@Authenticated()
export class ConfigCtrl {

    constructor(
        private scheduleService: ScheduleService) {
    }

    @Get('/general')
    getGeneralConfig(): GeneralSettings {

        return ConfigService.getGeneralSettings();

    }

    @Post('/general')
    setGeneralConfig(@BodyParams() body: GeneralSettings): void {
        if(body.elasticSearchUrl && body.alias) {
            ConfigService.setGeneralConfig(body);
            this.scheduleService.initialize();
        }

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

    @Post('/mapping/filecontent')
    importMappingFile(@BodyParams() file: any): void {
        if(file.format && file.ckan_dcat)
            ConfigService.importMappingFileContent(file);
    }

    @Delete('/mapping/distribution')
    deleteMappingDistribution(
        @QueryParams('source') source: string,
        @QueryParams('target') target: string): void {

        ConfigService.removeMappingDistribution({source, target});

    }

}
