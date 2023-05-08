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

import { elasticsearchMapping } from '../../statistic/index_check.mapping';
import { ConfigService } from '../config/ConfigService';
import { ElasticQueries } from '../../utils/elastic.queries';
import { ElasticSearchFactory } from '../../utils/elastic.factory';
import { ElasticSearchUtils } from '../../utils/elastic.utils';
import { ElasticSettings } from 'utils/elastic.setting';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader';
import { Service } from '@tsed/di';
import { Summary } from '../../model/summary';

const dayjs = require('dayjs');
const log = require('log4js').getLogger(__filename);

@Service()
export class IndexCheckService {

    private elasticUtils: ElasticSearchUtils;
    private elasticsearchSettings: ElasticSettings;
    private elasticQueries: ElasticQueries;

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
            includeTimestamp: false,
            index: 'index_check_history'
        };
        // @ts-ignore
        const summary: Summary = {};
        let profile = ProfileFactoryLoader.get();
        this.elasticUtils = ElasticSearchFactory.getElasticUtils(settings, summary);
        this.elasticsearchSettings = profile.getElasticSettings();
        this.elasticQueries = profile.getElasticQueries();
    }

    async getHistory() {
        let indexExists = await this.elasticUtils.isIndexPresent(this.elasticUtils.indexName);
        if (!indexExists) {
            await this.elasticUtils.prepareIndex(elasticsearchMapping, this.elasticsearchSettings, true);
        }
        return this.elasticUtils.getHistory(this.elasticUtils.indexName, this.elasticQueries.getIndexCheckHistory());
    }

    async start() {
        log.info('IndexCheck started!');
        let start = dayjs();
        let facetsByAttribution = await this.elasticUtils.getFacetsByAttribution();
        this.saveResult(facetsByAttribution, start.toDate());
    }

    async saveResult(result, timestamp) {
        try {
            await this.elasticUtils.addDocToBulk({
                timestamp: timestamp,
                attributions: result
            }, timestamp.toISOString());
            await this.elasticUtils.prepareIndex(elasticsearchMapping, this.elasticsearchSettings, true);
            await this.elasticUtils.finishIndex(false);
        }
        catch(err) {
            let message = 'Error occurred creating UrlCheck index';
            log.error(message, err);
        }
    }
}
