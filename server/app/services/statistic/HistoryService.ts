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

import { elasticsearchMapping } from '../../statistic/statistic.mapping';
import { ConfigService } from '../config/ConfigService';
import { ElasticQueries } from '../../utils/elastic.queries';
import { ElasticSearchFactory } from '../../utils/elastic.factory';
import { ElasticSearchUtils } from '../../utils/elastic.utils';
import { ElasticSettings } from '../../utils/elastic.setting';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader';
import { Service } from '@tsed/di';
import { Summary } from '../../model/summary';

@Service()
export class HistoryService {

    private elasticUtils: ElasticSearchUtils;
    private elasticsearchSettings: ElasticSettings;

    constructor() {
		this.initialize();
	}

	initialize() {
        let generalSettings = ConfigService.getGeneralSettings();
        let settings = {
            elasticSearchUrl: generalSettings.elasticSearchUrl,
            elasticSearchVersion: generalSettings.elasticSearchVersion,
            elasticSearchUser: generalSettings.elasticSearchUser,
            elasticSearchPassword: generalSettings.elasticSearchPassword,
            alias: generalSettings.alias,
            includeTimestamp: true,
            index: 'mcloud_harvester_statistic'
        };
        // @ts-ignore
        const summary: Summary = {};
        let profile = ProfileFactoryLoader.get();
        this.elasticUtils = ElasticSearchFactory.getElasticUtils(profile, settings, summary);
        this.elasticsearchSettings = profile.getElasticSettings();
    }

    async getHistory(id: number): Promise<any> {
        const harvester = ConfigService.get().find(h => h.id === id);
        let indexExists = await this.elasticUtils.isIndexPresent(this.elasticUtils.indexName);
        if (!indexExists) {
            await this.elasticUtils.prepareIndex(elasticsearchMapping, this.elasticsearchSettings, true);
        }
        let history = await this.elasticUtils.getHistory('mcloud_harvester_statistic', ElasticQueries.findHistory(harvester.index));
        return {
            harvester: harvester.description,
            ...history
        }
    }

    private SUM = (accumulator, currentValue) => accumulator + currentValue;

    async getHistoryAll(): Promise<any> {
        let history = await this.elasticUtils.getHistories();

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
                numESErrors: Object.values(harvester).map(h => h["numESErrors"]).reduce(this.SUM),
                duration: Object.values(harvester).map(h => h["duration"]).reduce(this.SUM)
            });
        });

        return {
            history: reduced_history
        }
    }
}
