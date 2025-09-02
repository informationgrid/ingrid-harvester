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

import { Service } from '@tsed/di';
import { Summary } from '../../model/summary.js';
import { ElasticsearchFactory } from '../../persistence/elastic.factory.js';
import { ElasticQueries } from '../../persistence/elastic.queries.js';
import { IndexSettings } from '../../persistence/elastic.setting.js';
import { ElasticsearchUtils } from '../../persistence/elastic.utils.js';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader.js';
import { elasticsearchMapping } from '../../statistic/statistic.mapping.js';
import { ConfigService } from '../config/ConfigService.js';

@Service()
export class HistoryService {

    private elasticQueries: ElasticQueries;
    private elasticUtils: ElasticsearchUtils;
    private indexSettings: IndexSettings;

    constructor() {
        this.initialize();
    }

    initialize() {
        let config = {
            ...ConfigService.getGeneralSettings().elasticsearch,
            includeTimestamp: true,
            index: 'harvester_statistic'
        };
        // @ts-ignore
        const summary: Summary = {};
        let profile = ProfileFactoryLoader.get();
        this.elasticUtils = ElasticsearchFactory.getElasticUtils(config, summary);
        this.indexSettings = profile.getIndexSettings();
        this.elasticQueries = profile.getElasticQueries();
    }

    async getHistory(id: number): Promise<any> {
        await this.ensureIndexExists();
        const harvester = ConfigService.get().find(h => h.id === id);
        let index = ProfileFactoryLoader.get().useIndexPerCatalog() ? harvester.catalogId : this.elasticUtils.indexName;
        let history = await this.elasticUtils.getHistory(this.elasticQueries.findHistory(index));
        return {
            harvester: harvester.description,
            ...history
        }
    }

    async ensureIndexExists() {
        let indexExists = await this.elasticUtils.isIndexPresent(this.elasticUtils.indexName);
        if (!indexExists) {
            await this.elasticUtils.prepareIndex(elasticsearchMapping, this.indexSettings, true);
        }
    }

    private SUM = (accumulator, currentValue) => accumulator + currentValue;

    async getHistoryAll(): Promise<any> {
        await this.ensureIndexExists();
        let { history } = await this.elasticUtils.getHistory(this.elasticQueries.findHistories(), 1000);

        let dates = [];

        await history.forEach(entry => {
            let date = entry.timestamp.substring(0, 10);
            let index = entry.base_index;
            (dates[date] = dates[date] || [])[index] = entry;
        });

        let reduced_history = [];
        Object.entries(dates).forEach(([date, harvester]) => {
            reduced_history.push({
                timestamp: date,
                harvester: Object.keys(harvester).map((index => ({ base_index: index, count: (harvester[index]["numRecords"] - harvester[index]["numSkipped"]) }))),
                numRecords: Object.values(harvester).map(h => h["numRecords"]).reduce(this.SUM),
                numSkipped: Object.values(harvester).map(h => h["numSkipped"]).reduce(this.SUM),
                numWarnings: Object.values(harvester).map(h => h["numWarnings"]).reduce(this.SUM),
                numRecordErrors: Object.values(harvester).map(h => h["numRecordErrors"]).reduce(this.SUM),
                numAppErrors: Object.values(harvester).map(h => h["numAppErrors"]).reduce(this.SUM),
                numDBErrors: Object.values(harvester).map(h => h["numDBErrors"]).reduce(this.SUM),
                numESErrors: Object.values(harvester).map(h => h["numESErrors"]).reduce(this.SUM),
                duration: Object.values(harvester).map(h => h["duration"]).reduce(this.SUM)
            });
        });

        return {
            history: reduced_history
        }
    }
}
