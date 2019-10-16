import {Harvester} from '../../../../client/src/app/harvester/model/harvester';
import {GeneralSettings} from '@shared/general-config.settings';
import * as fs from 'fs';
import {CkanImporter} from '../../importer/ckan/ckan.importer';
import {ExcelImporter} from '../../importer/excel/excel.importer';
import {CswImporter} from '../../importer/csw/csw.importer';
import {getLogger} from "log4js";

const log = getLogger();

export class ConfigService {

    private static GENERAL_CONFIG_FILE = "config-general.json";

    private static HARVESTER_CONFIG_FILE = "config.json";

    static highestID: number = 0;

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
            log.warn("No config.json file found. Please configure using the admin GUI.")
            return [];
        }

    }

    /**
     * Update a harvester and write to file this.HARVESTER_CONFIG_FILE
     * @param id
     * @param updatedHarvester
     */
    static update(id: number, updatedHarvester: Harvester) {
        let newConfig = ConfigService.get();

        if (id === -1) {
            updatedHarvester.id = ++ConfigService.highestID;
            newConfig.push(updatedHarvester);
        } else {
            newConfig = newConfig.map(harvester => harvester.id === updatedHarvester.id ? updatedHarvester : harvester);
        }

        fs.writeFileSync(this.HARVESTER_CONFIG_FILE, JSON.stringify(newConfig, null, 2));

    }

    static updateAll(updatedHarvesters: Harvester[]) {

        fs.writeFileSync(this.HARVESTER_CONFIG_FILE, JSON.stringify(updatedHarvesters, null, 2));

    }

    static getGeneralSettings(): GeneralSettings {

        const configExists = fs.existsSync(this.GENERAL_CONFIG_FILE);

        if (configExists) {
            let contents = fs.readFileSync(this.GENERAL_CONFIG_FILE);
            return JSON.parse(contents.toString());
        } else {
            log.warn("No general config file found (config-general.json). Using default config");
            return {
                elasticSearchUrl: "http://localhost:9200",
                alias: "mcloud",
                proxy: "",
                sessionSecret: "mysecretkey"
            };
        }

    }

    static setGeneralConfig(config: GeneralSettings) {

        fs.writeFileSync(this.GENERAL_CONFIG_FILE, JSON.stringify(config, null, 2));

    }
}
