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

'use strict';

import { merge as lodashMerge } from 'lodash';
import { Catalog } from '../model/dcatApPlu.model';
import { ConfigService } from '../services/config/ConfigService';
import { RequestDelegate, RequestOptions } from './http-request.utils';

const dayjs = require('dayjs');
const log = require('log4js').getLogger(__filename);
dayjs.extend(require('dayjs/plugin/customParseFormat'));

const CUSTOM_DATE_TIME_FORMATS = ["YYYY-MM-DDZ"];
const MAX_MSG_LENGTH = 4096;
const TRUNC_STR = '... (truncated)';

export class MiscUtils {

    /**
     * Deep merge objects without mutating the first one.
     * Helper method to prevent accidents.
     * 
     * @param objs the objects to merge
     * @return the merged object
     */
    public static merge(...objs) {
        // lodash mutates the first object on which it merges subsequent objects
        return lodashMerge({}, ...objs)
    }

    /**
     * For log output overview and ES indexing reasons, messages might want/need to be truncated.
     * We set an arbitrary limit for message length in `MAX_MSG_LENGTH`.
     * 
     * @param msg the message to be truncated
     * @param maxLength the maximum length of the resulting string
     * @return the string truncated to `maxLength` characters
     */
    public static truncateErrorMessage(msg: string, maxLength: number = MAX_MSG_LENGTH): string {
        return msg?.length > maxLength ? msg.substring(0, maxLength - TRUNC_STR.length) + TRUNC_STR : msg;
    }

    /**
     * Parse ISO8601-like datetime strings into `Date`s
     * 
     * @param datetime a datetime string in an ISO8601-like format
     * @return the Date object represented by the given datetime string
     */
    public static normalizeDateTime(datetime: string): Date {
        if (datetime == null) {
            return undefined;
        }
        let parsedDatetime = dayjs(datetime);
        // if format is not recognizable ISO8601, try to parse with custom formats
        if (!parsedDatetime.isValid()) {
            parsedDatetime = dayjs(datetime, CUSTOM_DATE_TIME_FORMATS);
        }
        if (parsedDatetime.isValid()) {
            // return parsedDatetime.format();
            return parsedDatetime.toDate();
        }
        log.warn("Could not parse datetime: " + datetime);
        return null;
    }

    /**
     * Get catalog information from OGC-Records-API
     * 
     * @param catalogId identifier of the requested catalog
     * @return the `Catalog` represented by the given catalogId
     */
    static async fetchCatalogFromOgcRecordsApi(catalogId: string): Promise<Catalog> {
        let generalSettings = ConfigService.getGeneralSettings();
        let config: RequestOptions = {
            method: 'GET',
            json: true,
            headers: {
                'User-Agent': 'InGrid Harvester. node-fetch',
                'Content-Type': 'application/json'
            },
            qs: {
                f: "json",
                v: "1"
            },
            resolveWithFullResponse: true,
            uri: generalSettings.ogcRecordsApi?.url + '/collections/' + catalogId
        };
        if (generalSettings.ogcRecordsApi?.user && generalSettings.ogcRecordsApi?.password) {
            let authString = generalSettings.ogcRecordsApi.user + ':' + generalSettings.ogcRecordsApi.password;
            config.headers['Authorization'] = 'Basic ' + Buffer.from(authString, 'utf8').toString('base64');
        }
        let requestDelegate = new RequestDelegate(config);
        let catalog = { identifier: catalogId, description: '', publisher: { name: '', organization: '' }, title: '' };
        try {
            let response = await requestDelegate.doRequest();
            if (response.status != 200) {
                throw Error(`status code: ${response.status} ${response.statusText}`);
            }
            catalog = await response.json();
            log.info('Successfully fetched catalog info from OGC Records API');
        }
        catch (e) {
            log.error(`Error fetching catalog "${catalogId}" from OGC Records API at [${config.uri}]: ${e}`);
        }
        return catalog;
    }

    /**
     * Simple heuristic to detect if a URL contains a downloadable resource
     * 
     * @param url the URL to check
     * @return true if the URL represents a downloadable resource, false  otherwise
     */
    // TODO expand/improve
    static isMaybeDownloadUrl(url: string): boolean {
        let ext = url.slice(url.lastIndexOf('.') + 1).toLowerCase();
        return ['jpeg', 'jpg', 'pdf', 'zip'].includes(ext) || url.toLowerCase().indexOf('service=wfs') > -1;
    }
}
