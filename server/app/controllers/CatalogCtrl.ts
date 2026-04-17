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

import type { CatalogSettings } from '@shared/catalog.js';
import { BodyParams, Controller, Delete, Get, PathParams, Post, UseAuth } from '@tsed/common';
import log4js from 'log4js';
import { KeycloakAuth } from "../decorators/KeycloakAuthOptions.js";
import { AuthMiddleware } from '../middlewares/auth/AuthMiddleware.js';
import { CatalogService } from '../services/catalog/CatalogService.js';

const log = log4js.getLogger(import.meta.filename);

@Controller('/api/catalogs')
@UseAuth(AuthMiddleware)
@KeycloakAuth({role: ["admin", "editor", "viewer"]})
export class CatalogCtrl {

    @Get('/')
    getCatalogs(): CatalogSettings[] {
        return CatalogService.getFilteredCatalogSettings();
    }

    @Get('/:identifier')
    getCatalog(@PathParams('identifier') id: number): CatalogSettings {
        return CatalogService.getFilteredCatalogSettings(id);
    }

    @Post('/')
    @KeycloakAuth({role: ["admin"]})
    addOrEditCatalog(@BodyParams() settings: CatalogSettings): CatalogSettings {
        return CatalogService.addOrEditCatalog(settings);
    }

    @Delete('/:identifier')
    @KeycloakAuth({role: ["admin"]})
    async deleteCatalog(@PathParams('identifier') id: number): Promise<void> {
        await CatalogService.removeCatalog(id);
    }
}
