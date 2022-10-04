/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2022 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

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
