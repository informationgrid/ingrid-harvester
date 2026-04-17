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

import type { ElasticsearchCatalogSettings } from '@shared/catalog.js';
import { Service } from '@tsed/di';
import { ElasticsearchFactory } from '../../persistence/elastic.factory.js';
import type { ElasticQueries } from '../../persistence/elastic.queries.js';
import type { IndexSettings } from '../../persistence/elastic.setting.js';
import { ElasticsearchUtils } from '../../persistence/elastic.utils.js';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader.js';
import elasticsearchMapping from '../../statistic/statistic.mapping.json' with { type: 'json' };
import { CatalogService } from '../catalog/CatalogService.js';
import { ConfigService } from '../config/ConfigService.js';

@Service()
export class HistoryService {

    private elasticQueries: ElasticQueries;
    private indexSettings: IndexSettings;

    constructor() {
        const profile = ProfileFactoryLoader.get();
        this.elasticQueries = profile.getElasticQueries();
        this.indexSettings = profile.getIndexSettings();
    }

    private get elasticUtils(): ElasticsearchUtils {
        const config = {
            ...ConfigService.getGeneralSettings().elasticsearch,
            includeTimestamp: true,
            index: 'harvester_statistic'
        };
        // @ts-ignore
        return ElasticsearchFactory.getElasticUtils(config, { errors: [] });
    }

    async getHistory(id: number): Promise<any> {
        await this.elasticUtils.prepareIndex(elasticsearchMapping, this.indexSettings, true);
        const harvester = ConfigService.getHarvesters().find(h => h.id === id);
        const catalogs = harvester.catalogIds.map(catalogId => CatalogService.getCatalogSettings(catalogId));
        const esCatalogs = <ElasticsearchCatalogSettings[]>catalogs.filter(settings => settings.type == 'elasticsearch');
        const histories = [];
        for (const catalog of esCatalogs) {
            let index = catalog.settings.index;
            histories.push(await this.elasticUtils.getHistory(this.elasticQueries.findHistory(index)));
        }
        return {
            harvester: harvester.description,
            // TODO
            ...histories
        }
    }

    private SUM = (accumulator, currentValue) => accumulator + currentValue;

    async getHistoryAll(): Promise<any> {
        await this.elasticUtils.prepareIndex(elasticsearchMapping, this.indexSettings, true);
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
