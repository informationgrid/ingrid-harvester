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

import { cloneDeep, merge as lodashMerge, trim } from 'lodash';
import { Distribution } from '../model/distribution';

const dayjs = require('dayjs');
const log = require('log4js').getLogger(__filename);
dayjs.extend(require('dayjs/plugin/customParseFormat'));

const CUSTOM_DATE_TIME_FORMATS = ["YYYY-MM-DDZ"];
const MAX_MSG_LENGTH = 4096;
const TRUNC_STR = '... (truncated)';

export function structuredClone(obj: object) {
    // TODO from nodejs 17 on, we can use the inbuilt function
    // return structuredClone(obj);
    // TODO until then, use an lodash equivalent
    return cloneDeep(obj);
}

/**
 * Deep merge objects without mutating the first one.
 * Helper method to prevent accidents.
 * 
 * @param objs the objects to merge
 * @return the merged object
 */
export function merge(...objs: object[]): any {
    // lodash mutates the first object on which it merges subsequent objects
    return lodashMerge({}, ...objs)
}

/**
 * Trim a string with custom characters using lodash.
 * 
 * @param str the string to strip
 * @param delim the characters to strip from the string
 * @return the input string stripped of the supplied characters
 */
export function strip(str: string, delim: string): string {
    return trim(str, delim);
}

/**
 * For log output overview and ES indexing reasons, messages might want/need to be truncated.
 * We set an arbitrary limit for message length in `MAX_MSG_LENGTH`.
 * 
 * @param msg the message to be truncated
 * @param maxLength the maximum length of the resulting string
 * @return the string truncated to `maxLength` characters
 */
export function truncateErrorMessage(msg: string, maxLength: number = MAX_MSG_LENGTH): string {
    return msg?.length > maxLength ? msg.substring(0, maxLength - TRUNC_STR.length) + TRUNC_STR : msg;
}

/**
 * Parse ISO8601-like datetime strings into `Date`s
 * 
 * @param datetime a datetime string in an ISO8601-like format
 * @return the Date object represented by the given datetime string
 */
export function normalizeDateTime(datetime: string): Date {
    if (!datetime) {
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

export function isUuid(s: string): boolean {
    if (s == null) {
        return false;
    }
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

/**
 * Create a hash for a given distribution
 * 
 * @param distribution the Distribution from which the hash should be created
 * @return a simple hash for the given distribution
 */
export function createDistHash(distribution: Distribution) {
    let s = [
        distribution.accessURL,
        distribution.format,
        distribution.issued,
        distribution.modified,
        distribution.title,
        distribution.temporal?.gte,
        distribution.temporal?.lte
    ].join('#');
    let hash = 0;
    for (let i = 0, len = s.length; i < len; i++) {
        let chr = s.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

/**
 * Naive file extension extraction
 * 
 * @param filename 
 * @returns 
 */
export function getFileExtension(filename: string) {
    let ext = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase();
    return ext.length < 5 ? ext : undefined;
}

/**
 * Simple heuristic to detect if a URL contains a downloadable resource
 * 
 * @param url the URL to check
 * @return true if the URL represents a downloadable resource, false  otherwise
 */
// TODO expand/improve
export function isMaybeDownloadUrl(url: string): boolean {
    let ext = getFileExtension(url);
    return ['jpeg', 'jpg', 'pdf', 'zip'].includes(ext) || url.toLowerCase().indexOf('service=wfs') > -1;
}
