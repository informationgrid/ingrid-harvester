/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2024 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or - as soon they will be
 * approved by the European Commission - subsequent versions of the
 * EUPL (the "Licence");
 *
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the Licence is distributed on an "AS IS" basis,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and
 * limitations under the Licence.
 * ==================================================
 */

import type { DatabaseConfiguration, ElasticsearchConfiguration, GeneralSettings } from '@shared/general-config.settings.js';
import type { MappingDistribution, MappingItem } from '@shared/mapping.model.js';
import { BodyParams, Controller, Delete, Get, Post, QueryParams, UseAuth } from '@tsed/common';
import log4js from 'log4js';
import { KeycloakAuth } from "../decorators/KeycloakAuthOptions.js";
import type { ImporterTypeInfo } from '../importer/importer.settings.js';
import { AuthMiddleware } from '../middlewares/auth/AuthMiddleware.js';
import { DatabaseFactory } from '../persistence/database.factory.js';
import { ElasticsearchFactory } from '../persistence/elastic.factory.js';
import { ElasticsearchUtils } from '../persistence/elastic.utils.js';
import { ProfileFactoryLoader } from '../profiles/profile.factory.loader.js';
import { ConfigService } from '../services/config/ConfigService.js';
import { ScheduleService } from '../services/ScheduleService.js';

const log = log4js.getLogger(import.meta.filename);

@Controller("/api/config")
@UseAuth(AuthMiddleware)
@KeycloakAuth({role: ["admin", "editor", "viewer"]})
export class ConfigCtrl {

    constructor(
        private scheduleService: ScheduleService) {
    }

    @Post('/dbcheck')
    async checkDbConnection(@BodyParams() body: DatabaseConfiguration): Promise<boolean> {
        try {
            return await DatabaseFactory.ping(body);
        } catch (error) {
            log.warn(error);
            return false;
        }
    }

    @Post('/escheck')
    async checkEsConnection(@BodyParams() body: Partial<ElasticsearchConfiguration>): Promise<boolean> {
        try {
            // @ts-ignore
            let esUtils: ElasticsearchUtils = ElasticsearchFactory.getElasticUtils(body, { errors: [] });
            return await esUtils.ping();
        } catch (error) {
            log.warn(error);
            return false;
        }
    }

    @Get('/profile')
    getProfile(): string {
        let profile = ProfileFactoryLoader.get();
        return profile.getProfileName();
    }

    @Get('/importer_types')
    getImporterTypes(): ImporterTypeInfo[] {
        const profile = ProfileFactoryLoader.get();
        return profile.getImporterTypes();
    }

    @Get('/general')
    getGeneralConfig(): GeneralSettings {
        return ConfigService.getFilteredGeneralSettings();
    }

    @Post('/general')
    @KeycloakAuth({role: ["admin"]})
    setGeneralConfig(@BodyParams() body: GeneralSettings): void {
        if(body.elasticsearch.url && body.elasticsearch.alias) {
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
    @KeycloakAuth({role: ["admin"]})
    addMappingDistribution(@BodyParams() item: MappingItem): void {
        ConfigService.addMappingDistribution(item);
    }

    @Post('/mapping/filecontent')
    @KeycloakAuth({role: ["admin"]})
    importMappingFile(@BodyParams() file: any): void {
        if(file.format && file.ckan_dcat)
            ConfigService.importMappingFileContent(file);
    }

    @Delete('/mapping/distribution')
    @KeycloakAuth({role: ["admin"]})
    deleteMappingDistribution(
        @QueryParams('source') source: string,
        @QueryParams('target') target: string): void {
        ConfigService.removeMappingDistribution({source, target});
    }
}
