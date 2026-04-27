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

import type { CatalogSettings, ElasticsearchCatalogSettings, PiveauCatalogSettings } from '@shared/catalog.js';
import * as fs from 'fs';
import log4js from 'log4js';
import { Summary } from '../../model/summary.js';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader.js';
import * as MiscUtils from '../../utils/misc.utils.js';
import { ConfigService } from '../config/ConfigService.js';

const log = log4js.getLogger();

export class CatalogService {

    private static CATALOG_CONFIG_FILE = "config-catalogs.json";

    static getCatalogSettings(): CatalogSettings[];

    static getCatalogSettings(id: number): CatalogSettings;

    static getCatalogSettings(id?: number): CatalogSettings | CatalogSettings[] {
        const catalogConfigFile = CatalogService.getCatalogConfigFile();
        const configExists = fs.existsSync(catalogConfigFile);
        if (configExists) {
            const catalogSettings = JSON.parse(fs.readFileSync(catalogConfigFile).toString());

            if (id) {
              const catalog = catalogSettings.find(settings => settings.id == id);
              if (!catalog) throw new Error(`Catalog with id ${id} not found`);
              return catalog;
            } else {
              return catalogSettings;
            }
        }
        else {
            log.warn("No catalog config file found (config-catalogs.json).");
            return [];
        }
    }

    static getFilteredCatalogSettings(): CatalogSettings[];

    static getFilteredCatalogSettings(id: number): CatalogSettings;

    static getFilteredCatalogSettings(id?: number): CatalogSettings | CatalogSettings[] {
        const catalogSettings = id == null ? this.getCatalogSettings() : [this.getCatalogSettings(id)];
        const filteredCatalogsSettings = catalogSettings.map(catalog => {
            let filtered = { ...catalog } as any;

            // Remove sensitive information from catalog settings.
            if (catalog['settings']?.['password'] || catalog['settings']?.['apiKey']) {
                return MiscUtils.removePaths(catalog as ElasticsearchCatalogSettings | PiveauCatalogSettings, [
                    "settings.password",
                    "settings.apiKey"
                ]);
            }

            return filtered;
        });
        if (filteredCatalogsSettings.length == 1) {
            return filteredCatalogsSettings[0];
        }
        return filteredCatalogsSettings;
    }

    static setCatalogSettings(config: CatalogSettings[]) {
        fs.writeFileSync(CatalogService.getCatalogConfigFile(), JSON.stringify(config, null, 2));
    }

    static addOrEditCatalog(settings: CatalogSettings): CatalogSettings {
        const createId = (settings: CatalogSettings[]) => {
            const ids = settings.map(s => s.id).sort();
            const maxId = ids.length > 0 ? Math.max(...ids) : 0;
            return maxId + 1;
        };
        const existingSettings = CatalogService.getCatalogSettings();
        // if id is given, update the pertaining catalog settings
        if (settings.id) {
            const catalogIndex = existingSettings.findIndex(catalog => catalog.id == settings.id);
            if (catalogIndex == -1) {
                throw new Error(`Catalog with id ${settings.id} not found`);
            }
            const existing = existingSettings[catalogIndex];
            if (existing.type == 'elasticsearch' && settings.type == 'elasticsearch') {
                MiscUtils.restorePaths(settings as ElasticsearchCatalogSettings, existing as ElasticsearchCatalogSettings, ['settings.password']);
            }
            else if (existing.type == 'piveau' && settings.type == 'piveau') {
                MiscUtils.restorePaths(settings as PiveauCatalogSettings, existing as PiveauCatalogSettings, ['settings.apiKey']);
            }
            existingSettings[catalogIndex] = settings;
        }
        // else create id and add new catalog settings to list
        else {
            settings.id = createId(existingSettings);
            existingSettings.push(settings);
        }
        // persist changes
        CatalogService.setCatalogSettings(existingSettings);
        return settings;
    }

    static async deleteRecordsFromCatalogs(datasourceId: number, catalogIds: number[]): Promise<void> {
        for (const catalogId of catalogIds) {
            try {
                const catalog = await ProfileFactoryLoader.get().getCatalog(catalogId, new Summary('catalogUnlink', {}));
                await catalog.deleteRecordsForDatasource(datasourceId);
            } catch (e) {
                log.error(`Failed to delete records for datasource '${datasourceId}' from catalog '${catalogId}': ${e}`);
            }
        }
    }

    static async removeCatalog(id: number) {
        const existingSettings = CatalogService.getCatalogSettings();
        const catalogIndex = existingSettings.findIndex(catalog => catalog.id == id);
        if (catalogIndex === -1) {
            throw new Error(`Catalog with id ${id} not found`);
        }

        // remove catalog datasets from target (elasticsearch, csw, piveau, ...)
        const catalog = await ProfileFactoryLoader.get().getCatalog(id, new Summary('catalogRemoval', {}));
        await catalog.deleteCatalog();
        await catalog.deleteCatalogRecordsFromDatabase();

        // remove catalog from datasources
        // TODO
        // this also must invalidate a datasource if it no longer contains any catalog after removal of this catalog
        // needs frontend changes

        // persist changes in settings
        CatalogService.setCatalogSettings(existingSettings.filter(catalog => catalog.id != id));
    }

    private static getCatalogConfigFile() {
        return ConfigService.getConfigFile(this.CATALOG_CONFIG_FILE);
    }
}