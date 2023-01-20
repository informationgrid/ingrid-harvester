/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2022 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

import {Service} from '@tsed/di';
import {ElasticSearchUtils} from "../../utils/elastic.utils";
import {ConfigService} from "../config/ConfigService";
import {Summary} from "../../model/summary";
import {now} from "moment";
import {elasticsearchMapping} from "../../statistic/url_check.mapping";
import {elasticsearchSettings} from "../../statistic/url_check.settings";
import { ElasticQueries } from '../../utils/elastic.queries';

let log = require('log4js').getLogger(__filename);

require('url').URL;

@Service()
export class IndexCheckService extends ElasticSearchUtils {

    constructor() {
        let generalSettings = ConfigService.getGeneralSettings();
        let settings = {
            elasticSearchUrl: generalSettings.elasticSearchUrl,
            elasticSearchPassword: generalSettings.elasticSearchPassword,
            alias: generalSettings.alias,
            includeTimestamp: false,
            index: 'index_check_history'
        };
        // @ts-ignore
        const summary: Summary = {};
        super(settings, summary);
    }

    async getHistory() {
        let result = await this.client.search({
            index: [this.indexName],
            body: ElasticQueries.getIndexCheckHistory(),
            size: 30
        });
        return {
            history: result.hits.hits.map(entry => entry._source)
        }
    }

    async start() {
        log.info('IndexCheck started!')
        let start = now();
        let facetsByAttribution = await this.getFacetsByAttribution();
        this.saveResult(facetsByAttribution, new Date(start));
    }

    async saveResult(result, timestamp) {
        try {
            await this.addDocToBulk({
                timestamp: timestamp,
                attributions: result
            }, timestamp.toISOString());
            await this.prepareIndex(elasticsearchMapping, elasticsearchSettings, true);
            await this.finishIndex(false);
        }
        catch(err) {
            let message = 'Error occurred creating UrlCheck index';
            log.error(message, err);
        }
    }
}
