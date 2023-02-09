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

const request = require('request');
require('url').URL;

@Service()
export class UrlCheckService extends ElasticSearchUtils {
    private generalSettings;

    constructor() {
        let generalSettings = ConfigService.getGeneralSettings();
        let settings = {
            elasticSearchUrl: generalSettings.elasticSearchUrl,
            elasticSearchPassword: generalSettings.elasticSearchPassword,
            alias: generalSettings.alias,
            includeTimestamp: false,
            index: 'url_check_history'
        };
        // @ts-ignore
        const summary: Summary = {};
        super(settings, summary);
        this.generalSettings = generalSettings;
    }

    async getHistory() {
        let result = await this.client.search({
            index: [this.indexName],
            body: ElasticQueries.getUrlCheckHistory(),
            size: 30
        });
        return {
            history: result.hits.hits.map(entry => entry._source)
        }
    }

    async start() {
        log.info('UrlCheck started!')
        let start = now();
        let result = [];
        let after_key = undefined;
        let count = 0;
        do {
            let urls = await this.getAccessUrls(after_key);
            count += urls.buckets.length;
            after_key = urls.after_key;
            await urls.buckets.map(url => this.getStatus(url)).reduce(function (statusMap, urlStatus) {
                return statusMap.then(statusMap => {
                    return urlStatus.then(
                        urlStatus => {
                            let status = urlStatus.status;
                            (statusMap[status] = statusMap[status] || []).push(urlStatus.url);
                            statusMap['status_list'] = statusMap['status_list'] || [];
                            if(statusMap['status_list'].indexOf(status) === -1)
                                statusMap['status_list'].push(status);
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

        this.cleanIndex();
    }

    private async getStatus(urlAggregation: any) {
        try {
            let url = urlAggregation.url.trim();
            if (url.startsWith('ftp://')) {
                return {url: urlAggregation, status: 'ftp'};
            }
            else {
                if(url.startsWith('/')){
                    if(this.generalSettings.portalUrl.endsWith('/'))
                        url = url.substring(1);
                    url = this.generalSettings.portalUrl + url;
                }
                let options: any = {timeout: 10000, proxy: this.generalSettings.proxy, rejectUnauthorized: false};
                request.head(url, options, function (error, response) {
                    if (error) {
                        throw Error(error);
                    }
                    return {url: urlAggregation, status: response.statusCode};
                });
            }
        }
        catch (ex) {
            return {url: urlAggregation, status: UrlCheckService.mapErrorMsg(ex.toString())};
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
                })
            }

            this.addDocToBulk({
                timestamp: timestamp,
                duration: duration,
                status: status_map
            }, timestamp.toISOString());

            try {
                await this.prepareIndex(elasticsearchMapping, elasticsearchSettings, true);
                await this.finishIndex(false);
            }
            catch(err) {
                let message = 'Error occurred creating UrlCheck index';
                log.error(message, err);
            }
        }
    }

    private async cleanIndex() {
        log.info('Cleanup UrlCheckHistory')
        const days = 40;
        await this.client.deleteByQuery({
            index: [this.indexName],
            body: {
                "query": {
                    "range": {
                        "timestamp": {
                            "lt":"now-"+days+"d/d"
                        }
                    }
                }
            }
        });
    }
}
