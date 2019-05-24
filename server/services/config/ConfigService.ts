import {Harvester} from '../../../client/src/app/harvester/model/harvester';
import * as fs from 'fs';

export class ConfigService {

    static fixIDs() {
        let harvesters = ConfigService.get();
        if (harvesters.some( h => !h.id)) {
            // get highest ID from all harvester
            let highestID: number = harvesters
                .map(h => h.id)
                .reduce( (id, acc) => id && id > acc ? id : acc) || 0;

            // add a new ID to those harvester, who need an ID
            let harvestersWithId = harvesters
                .map(h => {
                    if (!h.id) h.id = ++highestID;
                    return h;
                });

            ConfigService.updateAll(harvestersWithId);
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
        return JSON.parse(contents.toString())

    }

    /**
     * Update a harvester and write to file "config.json"
     * @param id
     * @param updatedHarvester
     */
    static update(id: number, updatedHarvester: Harvester) {

        let newConfig = ConfigService.get()
            .map( harvester => harvester.id === updatedHarvester.id ? updatedHarvester : harvester);

        fs.writeFileSync("config.json", JSON.stringify(newConfig, null, 2));

    }

    static updateAll(updatedHarvesters: Harvester[]) {

        fs.writeFileSync("config.json", JSON.stringify(updatedHarvesters, null, 2));

    }
}
