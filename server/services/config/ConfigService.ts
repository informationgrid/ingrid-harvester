import {Harvester} from '../../../client/src/app/harvester/model/harvester';
import * as fs from 'fs';
import {CkanImporter} from '../../importer/ckan/ckan.importer';
import {ExcelImporter} from '../../importer/excel/excel.importer';
import {CswImporter} from '../../importer/csw/csw.importer';

export class ConfigService {

    static highestID: number = 0;

    static fixIDs() {
        let harvesters = ConfigService.get();
        if (harvesters.some( h => !h.id)) {
            // get highest ID from all harvester
            ConfigService.highestID = harvesters
                .map(h => h.id)
                .reduce( (id, acc) => id && id > acc ? id : acc) || 0;

            // add a new ID to those harvester, who need an ID
            let harvestersWithId = harvesters
                .map(h => {
                    if (!h.id) h.id = ++ConfigService.highestID;
                    return h;
                });

            ConfigService.updateAll(harvestersWithId);
        } else {
            harvesters.forEach( h => {
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

        let contents = fs.readFileSync("config.json");
        let configs:Harvester[] = JSON.parse(contents.toString());
        return configs.map( config => {
            if (config.type === 'EXCEL') return {...ExcelImporter.defaultSettings, ...config};
            else if (config.type === 'CKAN') return {...CkanImporter.defaultSettings, ...config};
            else if (config.type.endsWith('CSW')) return {...CswImporter.defaultSettings, ...config};
        });

    }

    /**
     * Update a harvester and write to file "config.json"
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
        fs.writeFileSync("config.json", JSON.stringify(newConfig, null, 2));

    }

    static updateAll(updatedHarvesters: Harvester[]) {

        fs.writeFileSync("config.json", JSON.stringify(updatedHarvesters, null, 2));

    }
}
