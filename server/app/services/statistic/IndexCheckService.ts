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
import log4js from 'log4js';
import { ElasticsearchFactory } from '../../persistence/elastic.factory.js';
import type { ElasticQueries } from '../../persistence/elastic.queries.js';
import type { IndexSettings } from '../../persistence/elastic.setting.js';
import { ElasticsearchUtils } from '../../persistence/elastic.utils.js';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader.js';
import indexCheckMapping from '../../statistic/index_check.mapping.json' with { type: 'json' };
import dayjs from '../../utils/dayjs.js';
import { ConfigService } from '../config/ConfigService.js';

const log = log4js.getLogger(import.meta.filename);

@Service()
export class IndexCheckService {

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
            includeTimestamp: false,
            index: 'index_check_history'
        };
        // @ts-ignore
        return ElasticsearchFactory.getElasticUtils(config, { errors: [] });
    }

    async getHistory() {
        await this.elasticUtils.prepareIndex(indexCheckMapping, this.indexSettings, true);
        return this.elasticUtils.getHistory(this.elasticQueries.getIndexCheckHistory());
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
            await this.elasticUtils.prepareIndex(indexCheckMapping, this.indexSettings, true);
            await this.elasticUtils.finishIndex();
        }
        catch(err) {
            let message = 'Error occurred creating UrlCheck index';
            log.error(message, err);
        }
    }
}
