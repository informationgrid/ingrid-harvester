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

'use strict';

import { cloneDeep, merge as lodashMerge, trim } from 'lodash';
import { imageSize } from 'image-size';
import { Dimensions } from '../model/dimensions';
import { Distribution } from '../model/distribution';
import { DOMParser } from '@xmldom/xmldom';

const dayjs = require('dayjs');
const log = require('log4js').getLogger(__filename);
dayjs.extend(require('dayjs/plugin/customParseFormat'));

const CUSTOM_DATE_TIME_FORMATS = ["YYYY-MM-DDZ"];
const MAX_MSG_LENGTH = 4096;
const TRUNC_STR = '... (truncated)';

/**
 * Remove all `undefined` properties from an object.
 * 
 * @param obj the object to remove undefined properties from
 * @return the cleaned object
 */
export function cleanObject(obj: object) {
    let stack = [obj];
    while (stack.length) {
        let item = stack.pop();
        Object.entries(item).forEach(([key, val]) => {
            if (val === undefined) {
                delete item[key];
            }
            if (val instanceof Object) {
                stack.push(val);
            }
        });
    }
    return obj;
    // return pickBy(obj, v => v !== undefined);
}

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
 * Search a string in various haystacks (case-insensitive).
 * 
 * @param searchStr 
 * @param haystacks 
 * @returns 
 */
export function isIncludedI(searchStr: string, haystacks: (string | string[])[]): boolean {
    return haystacks.some((haystack: string | string[]) => {
        if (Array.isArray(haystack)) {
            return isIncludedI(searchStr, haystack);
        }
        return haystack?.toLowerCase().includes(searchStr.toLowerCase())
    });
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
 * Creates a DOMParser which swallows any log output below `error` level
 * 
 * @returns a new DOMParser
 */
export function getDomParser(): DOMParser {
    return new DOMParser({
        errorHandler: (level, msg) => {
            // throw on error, swallow rest
            if (level == 'error') {
                throw new Error(msg);
            }
        }
    });
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

/**
 * Partially download an image from a URL and extract its dimensions (width and height)
 * 
 * @param url the URL from which to fetch the image
 * @returns width an height of the image if 
 */
export async function getImageDimensionsFromURL(url: string): Promise<Dimensions> {
    try {
        let response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download image: HTTP status code ${response.status}`);
        }
        let reader = response.body.getReader();
        let chunks: Uint8Array[] = [];
        while (true) {
            let { value, done } = await reader.read();
            if (done) {
                throw new Error('Could not determine image dimensions from the downloaded data');
            }
            if (value) {
                chunks.push(value);
                let buffer = Buffer.concat(chunks);
                try {
                    let dimensions = imageSize(buffer);
                    reader.cancel();
                    return {
                        width: dimensions.width,
                        height: dimensions.height
                    };
                }
                catch (error) {
                    if (error.message.includes('not enough data')) {
                        // continue receiving data
                    }
                    else if (error.message.includes('exceeded buffer limits')) {
                        // continue receiving data
                    }
                    else {
                        reader.cancel();
                        throw error;
                    }
                }
            }
        }
    }
    catch (e) {
        // throw new Error(`Error getting image dimensions from ${url}: ${e.message}`);
        log.warn(`${e} for URL ${url}`);
        return null;
    }
}

/**
 * This function is to be used as a replacer callback in JSON.stringify.
 * It replaces the default `Date` ISO serialization with its millisecond timestamp.
 * This is useful e.g. for negative dates which trip up Elasticsearch.
 */
export function dateReplacer(key: string, value: any): any {
    // when used as a JSON.stringify callback, `this` refers to the to-be-stringified object
    // we cannot use `value` directly, because `Date` provides an inbuilt serialization via `Date.toJSON()`
    if (this[key] instanceof Date) {
        return this[key].valueOf();
    }
    return value;
}

export function isUuid(s: string): boolean {
    if (s == null) {
        return false;
    }
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export function extractDatasetUuid(url: string): string {
    let matches = url?.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/);
    return matches?.at(1);
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
 * Create a minimal pseudo hash for a given distribution.
 * Incorporates `accessURL` and `format`.
 * 
 * @param distribution the Distribution from which the hash should be created
 * @returns a simple hash for the given distribution
 */
export function minimalDistHash(distribution: Distribution) {
    return distribution.accessURL + '#' + distribution.format.join('#');
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

export function substringBeforeLast(s: string, delim: string) {
    if (s == null) {
        return null;
    }
    if (delim == null) {
        return s;
    }
    return s.substring(0, s.lastIndexOf(delim));
}

export function substringAfterLast(s: string, delim: string, fullFallback: boolean = false) {
    if (s == null) {
        return null;
    }
    if (delim == null) {
        return s;
    }
    let lastIdx = s.lastIndexOf(delim);
    if (lastIdx == -1) {
        if (fullFallback) {
            return s;
        }
        else {
            return '';
        }
    }
    return s.substring(lastIdx + delim.length);
}
