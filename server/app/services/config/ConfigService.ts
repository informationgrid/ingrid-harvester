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

import { GeneralSettings } from '@shared/general-config.settings';
import { Harvester } from '@shared/harvester';
import { MappingDistribution, MappingItem } from '@shared/mapping.model';
import * as fs from 'fs';
import { getLogger } from 'log4js';
import { defaultCKANSettings } from '../../importer/ckan/ckan.settings.js';
import { defaultCSWSettings } from '../../importer/csw/csw.settings.js';
import { defaultDCATSettings } from '../../importer/dcat/dcat.settings.js';
import { defaultExcelSettings } from '../../importer/excel/excel.settings.js';
import { defaultKldSettings } from '../../importer/kld/kld.settings.js';
import { defaultOAISettings } from '../../importer/oai/oai.settings.js';
import { Catalog } from '../../model/dcatApPlu.model.js';
import { DatabaseFactory } from '../../persistence/database.factory.js';
import { ElasticsearchFactory } from '../../persistence/elastic.factory.js';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader.js';
import * as MiscUtils from '../../utils/misc.utils.js';
import { UrlUtils } from '../../utils/url.utils.js';

const log = getLogger();

function parseIntOrUndefined(n: string): number {
    let parsedN = parseInt(n);
    return isNaN(parsedN) ? undefined : parsedN;
}

function parseBooleanOrUndefined(b: string): boolean {
    return (b === "true") || (b === "false") ? JSON.parse(b) : undefined;
}

export class ConfigService {

    private static GENERAL_CONFIG_FILE = "config-general.json";

    private static HARVESTER_CONFIG_FILE = "config.json";

    private static MAPPINGS_FILE = "mappings.json";

    private static mappingDistribution: MappingDistribution[] = ConfigService.initDistributionMapping();

    static highestID: number = 0;

    private static readonly defaultSettings: GeneralSettings = {
        database: {
            type: 'postgresql' as 'postgresql',
            connectionString: process.env.DB_CONNECTION_STRING,
            host: process.env.DB_URL,
            port: parseInt(process.env.DB_PORT),
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
        },
        elasticsearch: {
            url: process.env.ELASTIC_URL ?? "http://elastic:9200",
            version: process.env.ELASTIC_VERSION ?? "8",
            user: process.env.ELASTIC_USER ?? "elastic",
            password: process.env.ELASTIC_PASSWORD ?? "elastic",
            rejectUnauthorized: parseBooleanOrUndefined(process.env.ELASTIC_REJECT_UNAUTHORIZED) ?? true,
            index: process.env.ELASTIC_INDEX ?? "harvester-index",
            alias: process.env.ELASTIC_ALIAS ?? "harvester",
            prefix: process.env.ELASTIC_PREFIX ?? '',
            numberOfShards: parseIntOrUndefined(process.env.ELASTIC_NUM_SHARDS) ?? 1,
            numberOfReplicas: parseIntOrUndefined(process.env.ELASTIC_NUM_REPLICAS) ?? 0
        },
        mappingLogLevel: 'warn',
        proxy: process.env.PROXY_URL,
        allowAllUnauthorizedSSL: parseBooleanOrUndefined(process.env.ALLOW_ALL_UNAUTHORIZED) ?? false,
        portalUrl: process.env.PORTAL_URL,
        urlCheck:{
            active: false,
            pattern: ''
        },
        indexCheck:{
            active: false,
            pattern: ''
        },
        sessionSecret: "mysecretkey",
        mail: {
            enabled: false,
            mailServer: {
                host: "localhost",
                port: 465,
                secure: false,
                tls: {
                    rejectUnauthorized: true
                },
                auth: {
                    user: "",
                    pass: ""
                }
            },
            from: "test@example.com",
            to: "test@example.com"
        },
        indexBackup: {
            active: false,
            indexPattern: "",
            cronPattern: "",
            dir: ""
        },
        harvesting: {
            mail: {
                enabled: false,
                minDifference: 10
            },
            cancel: {
                enabled: false,
                minDifference: 10
            }
        }
    };
    private static ignoreCaseSort = (a: string, b: string) => {
        return a.toLowerCase().localeCompare(b.toLowerCase());
    };
    private static sortMappingDistribution = (a: MappingDistribution, b: MappingDistribution) => {
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    };

    private static initDistributionMapping(): MappingDistribution[] {
        let mapping = this.getMappingFileContent();
        return Object.keys(mapping.format)
            .reduce((prev, curr) => {
                prev.push({
                    name: curr,
                    items: mapping.format[curr]
                });
                return prev;
            }, []);
    }

    static fixIDs() {
        let harvesters = ConfigService.get();
        if (harvesters.some(h => !h.id)) {
            // get highest ID from all harvester
            ConfigService.highestID = harvesters
                .map(h => h.id)
                .reduce((id, acc) => id && id > acc ? id : acc) || 0;

            // add a new ID to those harvester, who need an ID
            let harvestersWithId = harvesters
                .map(h => {
                    if (!h.id) h.id = ++ConfigService.highestID;
                    return h;
                });

            ConfigService.updateAll(harvestersWithId);
        } else {
            harvesters.forEach(h => {
                if (h.id > ConfigService.highestID) ConfigService.highestID = h.id;
            });
        }
    }

    /**
     * Replaces config vars with values given by appropriate ENV vars.
     * Should only be called once, at the start of the application.
     */
    static adoptEnvs() {
        log.info('Updating general config from environment variables');
        let generalSettings = ConfigService.getGeneralSettings();
        let ENV = {
            database: {
                type: 'postgresql',
                connectionString: process.env.DB_CONNECTION_STRING,
                host: process.env.DB_URL,
                port: process.env.DB_PORT,
                database: process.env.DB_NAME,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
            },
            elasticsearch: {
                url: process.env.ELASTIC_URL,
                version: process.env.ELASTIC_VERSION,
                user: process.env.ELASTIC_USER,
                password: process.env.ELASTIC_PASSWORD,
                rejectUnauthorized: parseBooleanOrUndefined(process.env.ELASTIC_REJECT_UNAUTHORIZED),
                index: process.env.ELASTIC_INDEX,
                alias: process.env.ELASTIC_ALIAS,
                prefix: process.env.ELASTIC_PREFIX,
                numberOfShards: parseIntOrUndefined(process.env.ELASTIC_NUM_SHARDS),
                numberOfReplicas: parseIntOrUndefined(process.env.ELASTIC_NUM_REPLICAS)
            },
            proxy: process.env.PROXY_URL,
            allowAllUnauthorizedSSL: parseBooleanOrUndefined(process.env.ALLOW_ALL_UNAUTHORIZED),
            portalUrl: process.env.PORTAL_URL
        };
        let updatedSettings: GeneralSettings = MiscUtils.merge(generalSettings, ENV);
        ConfigService.setGeneralConfig(updatedSettings);
    }

    /**
     * Read the config.json file and return the json content, which
     * represents a collection of harvester.
     *
     * @returns a list of Harvester
     */
    static get(): Harvester[] {

        const harvesterConfigFile = this.getHarvesterConfigFile();

        const configExists = fs.existsSync(harvesterConfigFile);

        if (configExists) {
            let contents = fs.readFileSync(harvesterConfigFile);
            let configs: Harvester[] = JSON.parse(contents.toString());
            return configs
                .map(config => {
                    let defaultSettings = {};
                    switch (config.type) {
                        case 'CKAN': defaultSettings = defaultCKANSettings; break;
                        case 'CSW': defaultSettings = defaultCSWSettings; break;
                        case 'DCAT': defaultSettings = defaultDCATSettings; break;
                        case 'EXCEL': defaultSettings = defaultExcelSettings; break;
                        //case 'EXCEL_SPARSE': defaultSettings = ExcelSparseImporter.defaultSettings; break;
                        case 'KLD': defaultSettings = defaultKldSettings; break;
                        case 'OAI': defaultSettings = defaultOAISettings; break;
                        //case 'SPARQL': defaultSettings = SparqlImporter.defaultSettings; break;
                        //case 'WFS': defaultSettings = WfsImporter.defaultSettings; break;
                    }
                    return MiscUtils.merge(defaultSettings, config);
                })
                .filter(config => config); // remove all invalid configurations
        } else {
            log.warn("No config.json file found. Please configure using the admin GUI.");
            return [];
        }

    }


    static importHarvester(filecontent: any) {
        fs.writeFileSync(this.getHarvesterConfigFile(), JSON.stringify(filecontent, null, 2));
    }

    /**
     * Update a harvester and write to file this.HARVESTER_CONFIG_FILE
     * @param id
     * @param updatedHarvester
     */
    static update(id: number, updatedHarvester: Harvester): number {
        let newConfig = ConfigService.get();

        if (id === -1) {
            id = ++ConfigService.highestID;
            updatedHarvester.id = id;
            newConfig.push(updatedHarvester);
        } else {
            const itemIndex = newConfig.findIndex(harvester => harvester.id === updatedHarvester.id);
            if (itemIndex === -1) {
                log.warn('ID was not found for harvester. Creating new harvester with given ID: ' + updatedHarvester.id);
                newConfig.push(updatedHarvester);
            } else {
                newConfig.splice(itemIndex, 1, updatedHarvester);
            }
        }

        fs.writeFileSync(this.getHarvesterConfigFile(), JSON.stringify(newConfig, null, 2));
        return id;
    }

    static updateAll(updatedHarvesters: Harvester[]) {

        fs.writeFileSync(this.getHarvesterConfigFile(), JSON.stringify(updatedHarvesters, null, 2));

    }

    static getGeneralSettings(): GeneralSettings {

        const configExists = fs.existsSync(this.GENERAL_CONFIG_FILE);

        if (configExists) {
            let contents = fs.readFileSync(this.GENERAL_CONFIG_FILE);
            const settingsFromFile = JSON.parse(contents.toString());
            return MiscUtils.merge(
                this.defaultSettings,
                settingsFromFile
            );
        } else {
            log.warn("No general config file found (config-general.json). Using default config");
            return this.defaultSettings;
        }

    }

    static setGeneralConfig(config: GeneralSettings) {

        fs.writeFileSync(this.GENERAL_CONFIG_FILE, JSON.stringify(config, null, 2));
    }

    private static getDbUtils() {
        let generalConfig = ConfigService.getGeneralSettings();
        return DatabaseFactory.getDatabaseUtils(generalConfig.database, null);
    }

    private static getEsUtils() {
        let generalConfig = ConfigService.getGeneralSettings();
        return ElasticsearchFactory.getElasticUtils(generalConfig.elasticsearch, null);
    }

    static async getCatalogSizes(): Promise<any[]> {
        return await ConfigService.getDbUtils().getCatalogSizes(false);
    }

    static async getCatalogs(): Promise<Catalog[]> {
        let catalogs = await ConfigService.getDbUtils().listCatalogs();
        let esUtils = ConfigService.getEsUtils();
        let alias = ConfigService.getGeneralSettings().elasticsearch.alias;
        for (let catalog of catalogs) {
            let aliases = await esUtils.listAliases(catalog.identifier);
            catalog['isEnabled'] = aliases.includes(alias);
        }
        return catalogs;
    }

    static async addOrEditCatalog(catalog: Catalog) {
        if (catalog.id) {
            return await ConfigService.getDbUtils().updateCatalog(catalog);
        }
        else {
            let catalogPromise = await ConfigService.getDbUtils().createCatalog(catalog);

            // for ingrid, create a new index when a new catalog is created
            let profile = ProfileFactoryLoader.get();
            if (profile.useIndexPerCatalog()) {
                await this.getEsUtils().prepareIndexWithName(
                    catalog.identifier, profile.getIndexMappings(), profile.getIndexSettings(), true);
            }
            return profile.createCatalogIfNotExist(catalog);
        }
    }

    static async enableCatalog(catalogIdentifier: string, enable: boolean) {
        let alias = ConfigService.getGeneralSettings().elasticsearch.alias;
        if (enable) {
            await this.getEsUtils().addAlias(catalogIdentifier, alias);
        }
        else {
            await this.getEsUtils().removeAlias(catalogIdentifier, alias);
        }
    }

    static async removeCatalog(catalogIdentifier: string, datasetTarget: string) {
        let database = this.getDbUtils();
        let { id: catalogId } = await database.getCatalog(catalogIdentifier);
        // if no target is specified, delete datasets
        if (!datasetTarget) {
            await database.deleteDatasets(catalogId);
        }
        // otherwise, move them to target
        else {
            let targetCatalog = await database.getCatalog(datasetTarget);
            if (!targetCatalog) {
                throw new Error(`Target catalog ${datasetTarget} could not be found.`);
            }
            await database.moveDatasets(catalogId, targetCatalog.id) ;
        }
        // TODO then deduplicate all affected sources
        // then delete catalog from DB
        await database.deleteCatalog(catalogId);
        // at last, delete index from ES if applicable
        if (ProfileFactoryLoader.get().useIndexPerCatalog()) {
            let elastic = this.getEsUtils();
            await elastic.deleteIndex(catalogIdentifier);
        }
    }

    static getMappingDistribution(): MappingDistribution[] {
        return this.mappingDistribution;
    }

    static addMappingDistribution(item: MappingItem): void {

        const itemIndex = this.mappingDistribution.findIndex(map => map.name === item.target);

        if (itemIndex === -1) {
            this.mappingDistribution.push({
                name: item.target,
                items: [item.source]
            });
            this.mappingDistribution = this.mappingDistribution.sort(this.sortMappingDistribution);
        } else {
            this.mappingDistribution[itemIndex].items.push(item.source);
        }

        this.saveMappingDistribution();

        UrlUtils.updateFormatMapping();
    }

    static removeMappingDistribution(item: MappingItem): void {

        const itemIndex = this.mappingDistribution.findIndex(map => map.name === item.target);
        const itemMapIndex = this.mappingDistribution[itemIndex].items.findIndex(source => source === item.source);
        this.mappingDistribution[itemIndex].items.splice(itemMapIndex, 1);

        if (this.mappingDistribution[itemIndex].items.length === 0) {
            this.mappingDistribution.splice(itemIndex, 1);
        }

        this.saveMappingDistribution();

        UrlUtils.updateFormatMapping();
    }

    private static saveMappingDistribution() {
        let mapping = this.getMappingFileContent();

        mapping.format = this.convertMappingForFile();

        fs.writeFileSync(this.MAPPINGS_FILE, JSON.stringify(mapping, null, 2));
        this.mappingDistribution = ConfigService.initDistributionMapping();
    }

    static getMappingFileContent(): any {
        const content = fs.readFileSync(this.MAPPINGS_FILE);
        return JSON.parse(content.toString());
    }

    static importMappingFileContent(mapping) {
        fs.writeFileSync(this.MAPPINGS_FILE, JSON.stringify(mapping, null, 2));
        this.mappingDistribution = ConfigService.initDistributionMapping();
    }

    private static convertMappingForFile() {
        const unorderedResult = this.mappingDistribution
            .reduce((prev, curr) => {
                prev[curr.name] = curr.items;
                return prev;
            }, {});

        const ordered = {};
        Object.keys(unorderedResult).sort(this.ignoreCaseSort).forEach(function (key) {
            ordered[key] = unorderedResult[key];
        });

        return ordered;
    }

    private static getHarvesterConfigFile() {
        let configDir = process.env.IMPORTER_CONFIG_DIR;
        if (!configDir) {
            configDir = process.argv.find(arg => arg.toLowerCase().startsWith('--config_dir=')) ?? '';
            configDir = configDir.toLowerCase().replace('--config_dir=', '');
        }
        return configDir
            ? configDir + '/' + this.HARVESTER_CONFIG_FILE
            : this.HARVESTER_CONFIG_FILE;
    }
}
