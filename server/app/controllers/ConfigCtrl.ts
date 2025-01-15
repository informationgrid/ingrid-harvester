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

import { DatabaseConfiguration, ElasticsearchConfiguration, GeneralSettings } from '@shared/general-config.settings';
import { MappingDistribution, MappingItem } from '@shared/mapping.model';
import { BodyParams, Controller, Delete, Get, PathParams, Post, QueryParams, UseAuth } from '@tsed/common';
import { AuthMiddleware } from '../middlewares/auth/AuthMiddleware';
import { Catalog } from '../model/dcatApPlu.model';
import { DatabaseFactory } from '../persistence/database.factory';
import { ElasticsearchFactory } from '../persistence/elastic.factory';
import { ElasticsearchUtils } from '../persistence/elastic.utils';
import { ProfileFactoryLoader } from '../profiles/profile.factory.loader';
import { ConfigService } from '../services/config/ConfigService';
import { ScheduleService } from '../services/ScheduleService';

const log = require('log4js').getLogger(__filename);

@Controller("/api/config")
@UseAuth(AuthMiddleware)
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
            let esUtils: ElasticsearchUtils = ElasticsearchFactory.getElasticUtils(body, { elasticErrors: [] });
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

    @Get('/general')
    getGeneralConfig(): GeneralSettings {
        return ConfigService.getGeneralSettings();
    }

    @Post('/general')
    setGeneralConfig(@BodyParams() body: GeneralSettings): void {
        if(body.elasticsearch.url && body.elasticsearch.alias) {
            ConfigService.setGeneralConfig(body);
            this.scheduleService.initialize();
        }
    }

    @Get('/catalogs')
    async getCatalogs(): Promise<Catalog[]> {
        return await ConfigService.getCatalogs();
    }

    @Get('/catalogsizes')
    async getCatalogSizes(): Promise<any[]> {
        return await ConfigService.getCatalogSizes();
    }

    @Post('/catalogs')
    async addOrEditCatalog(@BodyParams() catalog: Catalog): Promise<void> {
        await ConfigService.addOrEditCatalog(catalog);
    }

    @Delete('/catalogs/:id')
    deleteCatalog(@PathParams('id') catalogId: number,
            @QueryParams('target') target: string) {
        ConfigService.removeCatalog(catalogId, target);
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
