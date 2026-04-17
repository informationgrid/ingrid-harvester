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

import type { Datasource } from '@shared/datasource.js';
import type { GeneralSettings } from '@shared/general-config.settings.js';
import type { MappingDistribution, MappingItem } from '@shared/mapping.model.js';
import * as fs from 'fs';
import log4js from 'log4js';
import { ckanDefaults } from '../../importer/ckan/ckan.settings.js';
import { cswDefaults } from '../../importer/csw/csw.settings.js';
import { dcatapdeDefaults } from '../../importer/dcatapde/dcatapde.settings.js';
import { genesisDefaults } from '../../importer/genesis/genesis.settings.js';
import { defaultImporterSettings, type ImporterSettings } from '../../importer/importer.settings.js';
import { kldDefaults } from '../../importer/kld/kld.settings.js';
import { oaiDefaults } from '../../importer/oai/oai.settings.js';
import { sparqlDefaults } from '../../importer/sparql/sparql.settings.js';
import { wfsDefaults } from '../../importer/wfs/wfs.settings.js';
import * as MiscUtils from '../../utils/misc.utils.js';
import { UrlUtils } from '../../utils/url.utils.js';

const log = log4js.getLogger();

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
        let harvesters = ConfigService.getHarvesters();
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
    static getHarvesters(): Datasource[] {
        const harvesterConfigFile = this.getHarvesterConfigFile();
        const configExists = fs.existsSync(harvesterConfigFile);

        if (!configExists) {
            log.warn("No config.json file found. Please configure using the admin GUI.");
            return [];
        }

        const contents = fs.readFileSync(harvesterConfigFile);
        const configs: Datasource[] = JSON.parse(contents.toString());
        return configs
            .map(config => {
                let defaultSettings: ImporterSettings = defaultImporterSettings;
                switch (config.type) {
                    case 'CKAN': defaultSettings = ckanDefaults; break;
                    case 'CSW': defaultSettings = cswDefaults; break;
                    case 'DCATAPDE': defaultSettings = dcatapdeDefaults; break;
                    case 'GENESIS': defaultSettings = genesisDefaults; break;
                    case 'KLD': defaultSettings = kldDefaults; break;
                    case 'OAI': defaultSettings = oaiDefaults; break;
                    case 'SPARQL': defaultSettings = sparqlDefaults; break;
                    case 'WFS': defaultSettings = wfsDefaults; break;
                }
                return MiscUtils.merge(defaultSettings, config);
            })
            .filter(config => config); // remove all invalid configurations
    }


    static importHarvester(filecontent: any) {
        fs.writeFileSync(this.getHarvesterConfigFile(), JSON.stringify(filecontent, null, 2));
    }

    /**
     * Update a harvester and write to file this.HARVESTER_CONFIG_FILE
     * 
     * @param id
     * @param updatedHarvester
     */
    static update(id: number, updatedHarvester: Datasource): number {
        const newConfig = ConfigService.getHarvesters();
        if (id === -1) {
            id = ++ConfigService.highestID;
            updatedHarvester.id = id;
            newConfig.push(updatedHarvester);
        }
        else {
            const itemIndex = newConfig.findIndex(harvester => harvester.id === updatedHarvester.id);
            if (itemIndex === -1) {
                log.warn('ID was not found for harvester. Creating new harvester with given ID: ' + updatedHarvester.id);
                newConfig.push(updatedHarvester);
            }
            else {
                newConfig.splice(itemIndex, 1, updatedHarvester);
            }
        }

        fs.writeFileSync(this.getHarvesterConfigFile(), JSON.stringify(newConfig, null, 2));
        return id;
    }

    static updateAll(updatedHarvesters: Datasource[]) {
        fs.writeFileSync(this.getHarvesterConfigFile(), JSON.stringify(updatedHarvesters, null, 2));
    }

    static getThreadpoolSize(): number {
        return parseInt(process.env.THREADPOOL_SIZE ?? '5', 10);
    }

    static getMaxLogsPerHarvester(): number {
        return parseInt(process.env.MAX_LOGS_PER_HARVESTER ?? '10', 10) || 10;
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

    static getFilteredGeneralSettings(): GeneralSettings {
        return MiscUtils.removePaths(this.getGeneralSettings(), [
            "database.password",
            "elasticsearch.password",
            "mail.mailServer.auth.pass"
        ]);
    }

    static setGeneralConfig(config: GeneralSettings) {
        const existing = this.getGeneralSettings();
        MiscUtils.restorePaths(config, existing, [
            "database.password",
            "elasticsearch.password",
            "mail.mailServer.auth.pass"
        ]);
        fs.writeFileSync(this.GENERAL_CONFIG_FILE, JSON.stringify(config, null, 2));
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
        return this.getConfigFile(this.HARVESTER_CONFIG_FILE);
    }

    static getConfigFile(filename: string) {
        let configDir = process.env.IMPORTER_CONFIG_DIR;
        if (!configDir) {
            configDir = process.argv.find(arg => arg.toLowerCase().startsWith('--config_dir=')) ?? '';
            configDir = configDir.toLowerCase().replace('--config_dir=', '');
        }
        return configDir
            ? configDir + '/' + filename
            : filename;
    }
}
