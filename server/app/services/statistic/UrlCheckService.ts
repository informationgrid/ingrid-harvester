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
import pLimit from 'p-limit';
import { fetch, type RequestInit } from 'undici';
import { ElasticsearchFactory } from '../../persistence/elastic.factory.js';
import type { ElasticQueries } from '../../persistence/elastic.queries.js';
import type { IndexSettings } from '../../persistence/elastic.setting.js';
import { ElasticsearchUtils } from '../../persistence/elastic.utils.js';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader.js';
import urlCheckMapping from '../../statistic/url_check.mapping.json' with { type: 'json' };
import dayjs from '../../utils/dayjs.js';
import { getDispatcher } from '../../utils/http-request.utils.js';
import { ConfigService } from '../config/ConfigService.js';

const log = log4js.getLogger(import.meta.filename);

@Service()
export class UrlCheckService {

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
            index: 'url_check_history'
        };
        // @ts-ignore
        return ElasticsearchFactory.getElasticUtils(config, { errors: [] });
    }

    async getHistory() {
        await this.elasticUtils.prepareIndex(urlCheckMapping, this.indexSettings, true);
        return this.elasticUtils.getHistory(this.elasticQueries.getUrlCheckHistory());
    }

    async start() {
        log.info('UrlCheck started!');
        const limit = pLimit(20);
        let start = dayjs();
        let result = {};
        let after_key = undefined;
        let count = 0;
        do {
            let urls = await this.elasticUtils.getAccessUrls(after_key);
            count += urls.buckets.length;
            after_key = urls.after_key;

            const urlStatuses = await Promise.all(
                urls.buckets.map(url => limit(() => this.getStatus(url)))
            );

            for (const urlStatus of urlStatuses) {
                if (urlStatus) {
                    let status = urlStatus.status;
                    (result[status] = result[status] || []).push(urlStatus.url);
                    result['status_list'] = result['status_list'] || [];
                    if (result['status_list'].indexOf(status) === -1) {
                        result['status_list'].push(status);
                    }
                }
            }
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
            const portalUrl = ConfigService.getGeneralSettings().portalUrl;
            if (portalUrl.endsWith('/')) {
                url = url.substring(1);
            }
            url = portalUrl + url;
        }
        const options: RequestInit = {
            method: 'HEAD',
            signal: AbortSignal.timeout(10000),
            dispatcher: getDispatcher()
        };
        try {
            let response = await fetch(url, options);
            return { url: urlAggregation, status: response.status };
        }
        catch (error: any) {
            const errorMsg = error?.name === 'TimeoutError' || error?.name === 'AbortError'
                ? error.name
                : (error?.message ?? String(error));
            return { url: urlAggregation, status: UrlCheckService.mapErrorMsg(errorMsg)};
        }
    }

    static mapErrorMsg(msg: string): string {
        if (!msg) return msg;
        let result = msg;
        if (
            msg.indexOf('ETIMEDOUT') !== -1 ||
            msg.indexOf('network timeout') !== -1 ||
            msg.indexOf('TimeoutError') !== -1 ||
            msg.indexOf('AbortError') !== -1 ||
            msg.indexOf('aborted due to timeout') !== -1 ||
            msg.indexOf('The operation was aborted') !== -1
        ) {
            return 'ETIMEDOUT';
        }
        if (msg.indexOf('ESOCKETTIMEDOUT') !== -1) return 'ESOCKETTIMEDOUT';
        if (msg.indexOf('ENOTFOUND') !== -1) return 'ENOTFOUND';
        if (msg.indexOf('ECONNRESET') !== -1) return 'ECONNRESET';
        if (msg.indexOf('ERR_INVALID_URL') !== -1 || msg.indexOf('Only absolute URLs') !== -1) return 'ERR_INVALID_URL';
        if (msg.indexOf('ERR_UNESCAPED_CHARACTERS') !== -1) return 'ERR_UNESCAPED_CHARACTERS';
        if (msg.indexOf('ECONNREFUSED') !== -1) return 'ECONNREFUSED';
        if (msg.indexOf('maximum redirect') !== -1) return 'Exceeded maxRedirects';
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
                await this.elasticUtils.prepareIndex(urlCheckMapping, this.indexSettings, true);
                await this.elasticUtils.finishIndex();
            }
            catch(err) {
                let message = 'Error occurred creating UrlCheck index';
                log.error(message, err);
            }
        }
    }
}
