import {Harvester} from '@shared/harvester';
import {GeneralSettings} from '@shared/general-config.settings';
import * as fs from 'fs';
import {CkanImporter} from '../../importer/ckan/ckan.importer';
import {ExcelImporter} from '../../importer/excel/excel.importer';
import {CswImporter} from '../../importer/csw/csw.importer';
import {getLogger} from "log4js";
import {MappingDistribution, MappingItem} from '@shared/mapping.model';
import {UrlUtils} from "../../utils/url.utils";

const log = getLogger();

export class ConfigService {

    private static GENERAL_CONFIG_FILE = "config-general.json";

    private static HARVESTER_CONFIG_FILE = "config.json";

    private static MAPPINGS_FILE = "mappings.json";

    private static mappingDistribution: MappingDistribution[] = ConfigService.initDistributionMapping();

    static highestID: number = 0;

    private static readonly defaultSettings = {
        elasticSearchUrl: "http://localhost:9200",
        alias: "mcloud",
        proxy: "",
        sessionSecret: "mysecretkey"
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
     * Read the config.json file and return the json content, which
     * represents a collection of harvester.
     *
     * @returns a list of Harvester
     */
    static get(): Harvester[] {

        const configExists = fs.existsSync(this.HARVESTER_CONFIG_FILE);

        if (configExists) {
            let contents = fs.readFileSync(this.HARVESTER_CONFIG_FILE);
            let configs: Harvester[] = JSON.parse(contents.toString());
            return configs
                .map(config => {
                    if (config.type === 'EXCEL') return {...ExcelImporter.defaultSettings, ...config};
                    else if (config.type === 'CKAN') return {...CkanImporter.defaultSettings, ...config};
                    else if (config.type && config.type.endsWith('CSW')) return {...CswImporter.defaultSettings, ...config};
                })
                .filter(config => config); // remove all invalid configurations
        } else {
            log.warn("No config.json file found. Please configure using the admin GUI.");
            return [];
        }

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

        fs.writeFileSync(this.HARVESTER_CONFIG_FILE, JSON.stringify(newConfig, null, 2));
        return id;
    }

    static updateAll(updatedHarvesters: Harvester[]) {

        fs.writeFileSync(this.HARVESTER_CONFIG_FILE, JSON.stringify(updatedHarvesters, null, 2));

    }

    static getGeneralSettings(): GeneralSettings {

        const configExists = fs.existsSync(this.GENERAL_CONFIG_FILE);

        if (configExists) {
            let contents = fs.readFileSync(this.GENERAL_CONFIG_FILE);
            const settingsFromFile = JSON.parse(contents.toString());
            return {
                ...this.defaultSettings,
                ...settingsFromFile
            };
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
    }

    static getMappingFileContent(): any {
        const content = fs.readFileSync(this.MAPPINGS_FILE);
        return JSON.parse(content.toString());
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
}
