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

import { merge as lodashMerge, isEqual as lodashIsEqual } from 'lodash';
import { Catalog } from '../model/dcatApPlu.model';
import { ConfigService } from '../services/config/ConfigService';
import { OptionsWithUri } from 'request-promise';
import { RequestDelegate } from './http-request.utils';
const log = require('log4js').getLogger(__filename);
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

const CUSTOM_DATE_TIME_FORMATS = ["YYYY-MM-DDZ"];
const MAX_MSG_LENGTH = 4096;
const TRUNC_STR = '... (truncated)';

export class MiscUtils {

    /**
     * Deep merge objects without mutating the first one.
     * Helper method to prevent accidents.
     * 
     * @param objs the objects to merge
     * @returns the merged object
     */
    public static merge(...objs: object[]) {
        // lodash mutates the first object on which it merges subsequent objects
        return lodashMerge({}, ...objs);
    }

    /**
     * Deep compare objects using lodash.
     * 
     * @param obj1 
     * @param obj2 
     * @returns true if both objects have the same properties with the same values (nested); false otherwise
     */
    public static equals(obj1: object, obj2: object) {
        return lodashIsEqual(obj1, obj2);
    }

    /**
     * For log output overview and ES indexing reasons, messages might want/need to be truncated.
     * We set an arbitrary limit for message length in `MAX_MESSAGE_LENGTH`.
     * 
     * @param msg the message to be truncated
     */
    public static truncateErrorMessage(msg: string) {
        return msg?.length > MAX_MSG_LENGTH ? msg.substring(0, MAX_MSG_LENGTH - TRUNC_STR.length) + TRUNC_STR : msg;
    }

    /**
     * Normalize datetime strings
     */
    public static normalizeDateTime(datetime: string): string {
        let parsedDatetime = dayjs(datetime);
        // if format is not recognizable ISO8601, try to parse with custom formats
        if (!parsedDatetime.isValid()) {
            parsedDatetime = dayjs(datetime, CUSTOM_DATE_TIME_FORMATS);
        }
        if (parsedDatetime.isValid()) {
            return parsedDatetime.format();
        }
        log.warn("Could not parse datetime: " + datetime);
        return datetime;
    }

    /**
     * Get catalog information from OGC-Records-API
     */
    static async fetchCatalogFromOgcRecordsApi(catalogId: string): Promise<Catalog> {
        let genSettings = ConfigService.getGeneralSettings();
        let authString = genSettings.ogcRecordsApiUser + ':' + genSettings.ogcRecordsApiPassword;
        let config: OptionsWithUri = {
            method: 'GET',
            json: true,
            headers: {
                'User-Agent': 'InGrid Harvester. Request-Promise',
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from(authString, 'utf8').toString('base64')
            },
            qs: {
                f: "json",
                v: "1"
            },
            uri: genSettings.ogcRecordsApiUrl + '/collections/' + catalogId
        };
        let requestDelegate = new RequestDelegate(config);
        let catalog = { identifier: catalogId, description: '', publisher: { organization: 'hhh' }, title: '' };
        try {
            catalog = await requestDelegate.doRequest();
            log.info('Successfully fetched catalog info from OGC Records API');
            return catalog;
        }
        catch (e) {
            log.warn(`Could not access OGC Records API at [${config.uri}]: ${e}`);
            throw e;
        }
    }
}
