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

import { BodyParams, Controller, Delete, Get, PathParams, Post, UseAuth } from '@tsed/common';
import log4js from 'log4js';
import type { CatalogSettings } from '../catalog/catalog.factory.js';
import { AuthMiddleware } from '../middlewares/auth/AuthMiddleware.js';
import { ConfigService } from '../services/config/ConfigService.js';

const log = log4js.getLogger(import.meta.filename);

@Controller('/api/catalogs')
@UseAuth(AuthMiddleware)
export class CatalogCtrl {

    @Get('/')
    getCatalogs(): CatalogSettings[] {
        return ConfigService.getCatalogs();
    }

    @Get('/:identifier')
    getCatalog(@PathParams('identifier') id: number): CatalogSettings {
        return ConfigService.getCatalog(id);
    }

    @Post('/')
    addOrEditCatalog(@BodyParams() settings: CatalogSettings): CatalogSettings {
        return ConfigService.addOrEditCatalog(settings);
    }

    // @Put('/:identifier')
    // async enableCatalog(@PathParams('identifier') catalogIdentifier: string,
    //         @QueryParams('enable') enable: boolean) {
    //     await ConfigService.enableLegacyCatalog(catalogIdentifier, enable);
    // }

    @Delete('/:identifier')
    async deleteCatalog(@PathParams('identifier') id: number): Promise<void> {
        await ConfigService.removeCatalog(id);
    }

    // @Post('/import/:id')
    // importFromHarvester(@PathParams('id') id: number, @QueryParams('isIncremental') isIncremental: boolean) {
    //     this.importSocketService.runImport(+id, isIncremental);
    // }

    // @Post('/importAll')
    // async importAllFromHarvester() {
    //     if (this.importAllProcessIsRunning) {
    //         log.info('Import process for all harvesters is already running - not starting again');
    //     }
    //     else {
    //         log.info('Started import process for all harvesters');
    //         this.importAllProcessIsRunning = true;

    //         let activeConfigs = ConfigService.get().filter(config => !config.disable);
    //         // run higher priority harvesters first (sort descending)
    //         activeConfigs.sort((harvesterA, harvesterB) => harvesterB.priority - harvesterA.priority);

    //         for (var i = 0; i < activeConfigs.length; i++) {
    //             await this.importSocketService.runImport(activeConfigs[i].id);
    //         }

    //         this.importAllProcessIsRunning = false;
    //     }
    // }

    // @Get('/lastLogs')
    // getLastLogs(): ImportLogMessage[] {
    //     return this.summaryService.getAll();
    // }

    // @Get('/log')
    // getLog(): string {
    //     return this.logService.get();
    // }

    // @Post('/schedule/:id')
    // schedule(@PathParams('id') id: number, @BodyParams('cron') cron: { full: CronData, incr: CronData }): Date[] {
    //     return this.scheduleService.set(+id, cron);
    // }

    // @Post('/url_check')
    // async checkURLs() {
    //     this.urlCheckService.start();
    // }

    // @Post('/index_check')
    // async checkIndices() {
    //     this.indexCheckService.start();
    // }
}
