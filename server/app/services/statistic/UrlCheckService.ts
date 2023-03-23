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

import { elasticsearchMapping } from '../../statistic/url_check.mapping';
import { now } from 'moment';
import { ConfigService } from '../config/ConfigService';
import { ElasticQueries } from '../../utils/elastic.queries';
import { ElasticSearchFactory } from '../../utils/elastic.factory';
import { ElasticSearchUtils } from '../../utils/elastic.utils';
import { ElasticSettings } from 'utils/elastic.setting';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader';
import { Service } from '@tsed/di';
import { Summary } from '../../model/summary';

const log = require('log4js').getLogger(__filename);
const request = require('request');

@Service()
export class UrlCheckService {

    private elasticUtils: ElasticSearchUtils;
    private elasticsearchSettings: ElasticSettings;
    private elasticQueries: ElasticQueries;
    private generalSettings;

    constructor() {
        this.initialize();
    }

    initialize() {
        this.generalSettings = ConfigService.getGeneralSettings();
        let settings = {
            elasticSearchUrl: this.generalSettings.elasticSearchUrl,
            elasticSearchVersion: this.generalSettings.elasticSearchVersion,
            elasticSearchUser: this.generalSettings.elasticSearchUser,
            elasticSearchPassword: this.generalSettings.elasticSearchPassword,
            alias: this.generalSettings.alias,
            includeTimestamp: false,
            index: 'url_check_history'
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
        return this.elasticUtils.getHistory(this.elasticUtils.indexName, this.elasticQueries.getUrlCheckHistory());
    }

    async start() {
        log.info('UrlCheck started!');
        let start = now();
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

        let duration = now() - start;
        log.info('UrlCheck: ' + (duration / 1000) + 's');
        await this.saveResult(result, new Date(start), duration);

        log.info('Cleanup UrlCheckHistory');
        await this.elasticUtils.deleteByQuery(40);
    }

    private async getStatus(urlAggregation: any) {
        try {
            let url = urlAggregation.url.trim();
            if (url.startsWith('ftp://')) {
                return { url: urlAggregation, status: 'ftp'};
            }
            else {
                if (url.startsWith('/')) {
                    if (this.generalSettings.portalUrl.endsWith('/')) {
                        url = url.substring(1);
                    }
                    url = this.generalSettings.portalUrl + url;
                }
                let options: any = { timeout: 10000, proxy: this.generalSettings.proxy, rejectUnauthorized: false };
                request.head(url, options, function (error, response) {
                    if (error) {
                        return { url: urlAggregation, status: UrlCheckService.mapErrorMsg(error.code)};
                    }
                    return { url: urlAggregation, status: response.statusCode };
                });
            }
        }
        catch (ex) {
            return { url: urlAggregation, status: UrlCheckService.mapErrorMsg(ex.toString())};
        }
    }

    static mapErrorMsg(msg: string): string {
        let result = msg;
        if (msg.indexOf('ETIMEDOUT') !== -1) result = 'ETIMEDOUT';
        if (msg.indexOf('ESOCKETTIMEDOUT') !== -1) result = 'ESOCKETTIMEDOUT';
        if (msg.indexOf('ENOTFOUND') !== -1) result = 'ENOTFOUND';
        if (msg.indexOf('ECONNRESET') !== -1) result = 'ECONNRESET';
        if (msg.indexOf('ERR_INVALID_URL') !== -1 || msg.indexOf('Error: Invalid URI')  !== -1) result = 'ERR_INVALID_URL';
        if (msg.indexOf('ERR_UNESCAPED_CHARACTERS') !== -1) result = 'ERR_UNESCAPED_CHARACTERS';
        if (msg.indexOf('ECONNREFUSED') !== -1) result = 'ECONNREFUSED';
        if (msg.indexOf('Exceeded maxRedirects') !== -1) result = 'Exceeded maxRedirects';
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
                await this.elasticUtils.prepareIndex(elasticsearchMapping, this.elasticsearchSettings, true);
                await this.elasticUtils.finishIndex(false);
            }
            catch(err) {
                let message = 'Error occurred creating UrlCheck index';
                log.error(message, err);
            }
        }
    }
}
