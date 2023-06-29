/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
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

import {Harvester} from '@shared/harvester';
import {GeneralSettings} from '@shared/general-config.settings';
import * as fs from 'fs';
import {getLogger} from "log4js";
import {MappingDistribution, MappingItem} from '@shared/mapping.model';
import {UrlUtils} from "../../utils/url.utils";
import { MiscUtils } from '../../utils/misc.utils';
import {defaultCKANSettings} from "../../importer/ckan/ckan.settings";
import {defaultExcelSettings} from "../../importer/excel/excel.settings";
import {defaultCSWSettings} from "../../importer/csw/csw.settings";
import {defaultOAISettings} from "../../importer/oai/oai.settings";
import {defaultDCATSettings} from "../../importer/dcat/dcat.settings";

const log = getLogger();

function parseIntOrUndefined(n: string): number {
    let parsedN = parseInt(n);
    return isNaN(parsedN) ? undefined : parsedN;
}

export class ConfigService {

    private static GENERAL_CONFIG_FILE = "config-general.json";

    private static HARVESTER_CONFIG_FILE = "config.json";

    private static MAPPINGS_FILE = "mappings.json";

    private static mappingDistribution: MappingDistribution[] = ConfigService.initDistributionMapping();

    static highestID: number = 0;

    private static readonly defaultSettings: GeneralSettings = {
        elasticsearch: {
            url: process.env.ELASTIC_URL ?? "http://elastic:9200",
            version: process.env.ELASTIC_VERSION ?? "8",
            user: process.env.ELASTIC_USER ?? "elastic",
            password: process.env.ELASTIC_PASSWORD ?? "elastic",
            alias: process.env.ELASTIC_ALIAS ?? "mcloud",
            prefix: process.env.ELASTIC_PREFIX ?? '',
            numberOfShards: parseIntOrUndefined(process.env.ELASTIC_NUM_SHARDS) ?? 1,
            numberOfReplicas: parseIntOrUndefined(process.env.ELASTIC_NUM_REPLICAS) ?? 0
        },
        proxy: "",
        portalUrl: "https://mcloud.de/",
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
        maxDiff: 10
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
            elasticsearch: {
                url: process.env.ELASTIC_URL,
                version: process.env.ELASTIC_VERSION,
                user: process.env.ELASTIC_USER,
                password: process.env.ELASTIC_PASSWORD,
                alias: process.env.ELASTIC_ALIAS,
                prefix: process.env.ELASTIC_PREFIX,
                numberOfShards: parseIntOrUndefined(process.env.ELASTIC_NUM_SHARDS),
                numberOfReplicas: parseIntOrUndefined(process.env.ELASTIC_NUM_REPLICAS)
            },
            ogcRecordsApi: {
                url: process.env.OGCAPI_URL,
                user: process.env.OGCAPI_USER,
                password: process.env.OGCAPI_PASSWORD
            }
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
        const configDir = process.env.MCLOUD_IMPORTER_CONFIG_DIR;
        return configDir
            ? configDir + '/' + this.HARVESTER_CONFIG_FILE
            : this.HARVESTER_CONFIG_FILE;
    }
}
