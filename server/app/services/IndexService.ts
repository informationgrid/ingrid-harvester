import {Service} from '@tsed/di';
import {ConfigService} from './config/ConfigService';
import {ElasticSearchUtils} from '../utils/elastic.utils';
import {ElasticSettings} from '../utils/elastic.setting';
import {Summary} from '../model/summary';
import {Index} from '@shared/index.model';

let log = require('log4js').getLogger(__filename);

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
        const summary: Summary = {};
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

    private async getIndexFromHarvesterID(id: number): Promise<String> {
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

    async search(indexName: string): Promise<any> {
        const response = await this.elasticUtils.search(indexName);
        return response.hits.hits;
    }
}
