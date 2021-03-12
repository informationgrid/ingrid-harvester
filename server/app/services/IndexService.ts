import {Service} from '@tsed/di';
import {ConfigService} from './config/ConfigService';
import {ElasticSearchUtils} from '../utils/elastic.utils';
import {ElasticSettings} from '../utils/elastic.setting';
import {Summary} from '../model/summary';
import {Index} from '@shared/index.model';
import * as fs from "fs";

let log = require('log4js').getLogger(__filename);
var path = require('path');

@Service()
export class IndexService {

    private alias: string;
    private elasticUtils: ElasticSearchUtils;

    constructor() {

        this.initialize();

    }

    /**
     * Start all cron jobs configured in each harvester
     */
    initialize() {

        let generalSettings = ConfigService.getGeneralSettings();
        this.alias = generalSettings.alias;
        const settings: ElasticSettings = {
            elasticSearchUrl: generalSettings.elasticSearchUrl,
            alias: generalSettings.alias,
            includeTimestamp: true,
            index: ''
        };
        // @ts-ignore
        const summary: Summary = {elasticErrors: []};
        this.elasticUtils = new ElasticSearchUtils(settings, summary);

    }

    async addToAlias(id: number) {
        const index = await this.getIndexFromHarvesterID(id);

        if (index) {
            return this.elasticUtils.addAlias(index, this.alias);
        }
    }

    async removeFromAlias(id: number) {
        const index = await this.getIndexFromHarvesterID(id);
        if (index) {
            return this.elasticUtils.removeAlias(index, this.alias);
        }
    }

    private async getIndexFromHarvesterID(id: number): Promise<string> {
        const harvester = ConfigService.get().find(h => h.id === id);
        let indices = await this.elasticUtils.getIndicesFromBasename(harvester.index);

        // if multiple indices, then there might be an indexing process
        // we should be able to ignore adding an alias, since it should happen automatically after indexing
        if (indices.length !== 1) {
            log.warn('The index cannot be identified by its basename in a unique name ' + JSON.stringify(indices));
            log.warn('Is there a harvest going on, where a temporary new index is created?');
            return null;
        }
        return indices[0].name;
    }

    async getIndices(): Promise<Index[]> {
        return await this.elasticUtils.getIndicesFromBasename('')
    }

    deleteIndex(name: string) {
        this.elasticUtils.deleteIndex(name);
    }

    async deleteIndexFromHarvester(id: number) {
        const indexName = await this.getIndexFromHarvesterID(id);
        this.elasticUtils.deleteIndex(indexName);
    }

    async search(indexName: string): Promise<any> {
        const response = await this.elasticUtils.search(indexName);
        return response.hits.hits;
    }

    async exportIndex(name: string): Promise<any> {
        let settings = await this.elasticUtils.getIndexSettings(name);
        let mapping = await this.elasticUtils.getIndexMapping(name);
        let data = await this.elasticUtils.getAllEntries(name);

        return {
            index: name,
            settings: {
                number_of_shards: settings[name].settings.index.number_of_shards,
                number_of_replicas: settings[name].settings.index.number_of_replicas,
                analysis: settings[name].settings.index.analysis
            },
            mappings: mapping[name].mappings,
            data: data
        }
    }

    async saveIndices(pattern: string, dir: string) {
        log.info("Create Backup of Indices! Pattern: /"+pattern+"/i")
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir)
        }
        let regExp = new RegExp(pattern, "i");
        this.getIndices().then(indices => {
            indices.filter(index => index.name.match(regExp))
                .forEach(index =>
                    this.exportIndex(index.name).then(json => {
                        let file = path.join(dir, index.name + ".json")
                        fs.writeFileSync(file, JSON.stringify(json, null, 2));
                    }));
        });
    }

    async importIndex(json: any): Promise<any> {
        //let settings = json.settings;
        //let mapping = await this.elasticUtils.getIndexMapping(name);
        //let data = await this.elasticUtils.getAllEntries(name);

        await this.elasticUtils.prepareIndexWithName(json.index, json.mappings, json.settings);
        let bulkData = [];
        let type = Object.keys(json.mappings)[0];
        let promise = new Promise(resolve => {
            resolve()
        });
        json.data.forEach(entry => {
            bulkData.push({
                index: {
                    _id: entry._id
                }
            });
            bulkData.push(entry._source)

            if (bulkData.length >= (ElasticSearchUtils.maxBulkSize * 2)) {
                let data = [];
                bulkData.forEach(entry => data.push(entry));
                bulkData = [];
                promise = promise.then(() => this.elasticUtils.bulkWithIndexName(json.index, type, data, false));

            }
        });
        return await promise
            .then(() => this.elasticUtils.bulkWithIndexName(json.index, type, bulkData, false))
            .then(() => this.elasticUtils.client.cluster.health({waitForStatus: 'yellow'}));
    }
}
