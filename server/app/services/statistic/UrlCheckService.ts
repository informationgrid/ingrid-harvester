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

import fetch, { RequestInit } from 'node-fetch';
import { elasticsearchMapping } from '../../statistic/url_check.mapping';
import { Agent } from 'https';
import { ConfigService } from '../config/ConfigService';
import { ElasticQueries } from '../../persistence/elastic.queries';
import { ElasticsearchFactory } from '../../persistence/elastic.factory';
import { ElasticsearchUtils } from '../../persistence/elastic.utils';
import { IndexSettings } from '../../persistence/elastic.setting';
import { GeneralSettings } from '@shared/general-config.settings';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader';
import { Service } from '@tsed/di';
import { Summary } from '../../model/summary';

const dayjs = require('dayjs');
const log = require('log4js').getLogger(__filename);

@Service()
export class UrlCheckService {

    private elasticQueries: ElasticQueries;
    private elasticUtils: ElasticsearchUtils;
    private generalSettings: GeneralSettings;
    private indexSettings: IndexSettings;

    private httpsAgent: Agent;

    constructor() {
        this.initialize();
        if (this.generalSettings.proxy) {
            this.httpsAgent = new HttpsProxyAgent(this.generalSettings.proxy);
            this.httpsAgent.options.rejectUnauthorized = false;
        }
        else {
            this.httpsAgent = new Agent({
                rejectUnauthorized: false
            });
        }
    }

    initialize() {
        this.generalSettings = ConfigService.getGeneralSettings();
        let config = {
            ...this.generalSettings.elasticsearch,
            includeTimestamp: false,
            index: 'url_check_history'
        };
        // @ts-ignore
        const summary: Summary = {};
        let profile = ProfileFactoryLoader.get();
        this.elasticUtils = ElasticsearchFactory.getElasticUtils(config, summary);
        this.indexSettings = profile.getIndexSettings();
        this.elasticQueries = profile.getElasticQueries();
    }

    async getHistory() {
        let indexExists = await this.elasticUtils.isIndexPresent(this.elasticUtils.indexName);
        if (!indexExists) {
            await this.elasticUtils.prepareIndex(elasticsearchMapping, this.indexSettings, true);
        }
        return this.elasticUtils.getHistory(this.elasticQueries.getUrlCheckHistory());
    }

    async start() {
        log.info('UrlCheck started!');
        let start = dayjs();
        let result = [];
        let after_key = undefined;
        let count = 0;
        do {
            let urls = await this.elasticUtils.getAccessUrls(after_key);
            count += urls.buckets.length;
            after_key = urls.after_key;
            await urls.buckets.map(url => this.getStatus(url)).reduce(function (statusMap, urlStatus) {
                return statusMap.then(statusMap => {
                    return urlStatus.then(
                        urlStatus => {
                            if (urlStatus) {
                                let status = urlStatus.status;
                                (statusMap[status] = statusMap[status] || []).push(urlStatus.url);
                                statusMap['status_list'] = statusMap['status_list'] || [];
                                if (statusMap['status_list'].indexOf(status) === -1) {
                                    statusMap['status_list'].push(status);
                                }
                            }
                            return statusMap;
                        });
                });
            }, new Promise(resolve => {
                resolve(result);
            }));
            log.info('UrlCheck: ' + count);
        } while (after_key);

        let duration = dayjs().diff(start);
        log.info('UrlCheck: ' + (duration / 1000) + 's');
        await this.saveResult(result, start.toDate(), duration);

        log.info('Cleanup UrlCheckHistory');
        await this.elasticUtils.deleteByQuery(40);
    }

    private async getStatus(urlAggregation: any) {
        let url = urlAggregation.url.trim();
        if (url.startsWith('ftp://')) {
            return { url: urlAggregation, status: 'ftp'};
        }
        if (url.startsWith('/')) {
            if (this.generalSettings.portalUrl.endsWith('/')) {
                url = url.substring(1);
            }
            url = this.generalSettings.portalUrl + url;
        }
        let options: RequestInit = {
            method: 'HEAD',
            timeout: 10000,
            agent: url.startsWith('https://') ? this.httpsAgent : undefined
        };
        try {
            let response = await fetch(url, options);
            return { url: urlAggregation, status: response.status };
        }
        catch (error) {
            return { url: urlAggregation, status: UrlCheckService.mapErrorMsg(error.message)};
        }
    }

    static mapErrorMsg(msg: string): string {
        let result = msg;
        if (msg.indexOf('ETIMEDOUT') !== -1 || msg.indexOf('network timeout')) result = 'ETIMEDOUT';
        if (msg.indexOf('ESOCKETTIMEDOUT') !== -1) result = 'ESOCKETTIMEDOUT';
        if (msg.indexOf('ENOTFOUND') !== -1) result = 'ENOTFOUND';
        if (msg.indexOf('ECONNRESET') !== -1) result = 'ECONNRESET';
        if (msg.indexOf('ERR_INVALID_URL') !== -1 || msg.indexOf('Only absolute URLs') !== -1) result = 'ERR_INVALID_URL';
        if (msg.indexOf('ERR_UNESCAPED_CHARACTERS') !== -1) result = 'ERR_UNESCAPED_CHARACTERS';
        if (msg.indexOf('ECONNREFUSED') !== -1) result = 'ECONNREFUSED';
        if (msg.indexOf('maximum redirect')) result = 'Exceeded maxRedirects';
        return result;
    }

    async saveResult(result, timestamp, duration) {
        let status_list = result['status_list'];
        if (status_list) {
            let status_map = [];
            for (let i = 0; i < status_list.length; i++) {
                let status = status_list[i];
                let urls = result[status];
                status_map.push({
                    code: status.toString(),
                    url: urls
                });
            }

            this.elasticUtils.addDocToBulk({
                timestamp: timestamp,
                duration: duration,
                status: status_map
            }, timestamp.toISOString());

            try {
                await this.elasticUtils.prepareIndex(elasticsearchMapping, this.indexSettings, true);
                await this.elasticUtils.finishIndex(false);
            }
            catch(err) {
                let message = 'Error occurred creating UrlCheck index';
                log.error(message, err);
            }
        }
    }
}
