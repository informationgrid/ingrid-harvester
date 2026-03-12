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

import * as fs from 'fs';
import fetch from 'node-fetch';
import log4js from 'log4js';
import { ConfigService } from '../services/config/ConfigService.js';
import type { RequestOptions } from './http-request.utils.js';
import { RequestDelegate } from './http-request.utils.js';

const log = log4js.getLogger(import.meta.filename);

export class UrlUtils {

    private static MAPPINGS_FILE = "mappings.json";

    static cache: { [url: string]: boolean } = {};

    private static formatMapping = UrlUtils.getFormatMapping();

    static async status(url: string | URL): Promise<number> {
        if (url instanceof URL) {
            url = url.hostname + url.pathname;
        }
        let response = await fetch(url, { method: 'HEAD' });
        return response.status;
    }

    /**
     * Rudimentary checks for URL validity. This method extracts the request
     * URI from the given configuration, and returns
     * - this URI unmodified if it contains the substring '://' if `fullCheck` = true
     * - this URI unmodified if it contains the substring '://' if a GET request to the resulting URI
     *   returns a status code of 200
     * - this URI prefixed with 'https://' if a GET request to the resulting URI
     *   returns a status code of 200
     * - this URI prefixed with 'http://' if a GET request to the resulting URI
     *   returns a status code of 200
     * - undefined for all other cases
     *
     * @param requestConfig configuration object for HTTP requests
     * @returns the uri of the requestConfig, if it already contains a protocol,
     * or the uri prefixed with 'https://' or 'http://' if these are reachable,
     * or undefined otherwise
     */
    static async urlWithProtocolFor(requestConfig: RequestOptions, skip = false, fullCheck = false): Promise<string> {
        let url = <string>requestConfig.uri;
        if (skip) {
            return url;
        }
        if (url?.trim()) {
            // we assume that an URL which contains '://' also has a protocol
            if (url.includes('://')) {
                if (!fullCheck || await UrlUtils.checkUrlWithProtocol(requestConfig)) {
                    return url;
                }
            }
            else {
                // if URL is just a domain name with no protocol then first check if it may be a local path instead
                // examples: /data/file.xml, \\data\file.xml, <Geoserver>\data\file.xml
                if (!/^[a-zA-Z]/.test(url)) {
                    return url;
                }
                // if not, check if 'https://' works
                requestConfig.uri = `https://${url}`;
                if (await UrlUtils.checkUrlWithProtocol(requestConfig)) {
                    return requestConfig.uri;
                }
                // otherwise try with 'http://'
                requestConfig.uri = `http://${url}`;
                if (await UrlUtils.checkUrlWithProtocol(requestConfig)) {
                    return requestConfig.uri;
                }
            }
        }
        return undefined;
    }

    /**
     * Test the given protocol with a URL. If the URL is reachable
     * then return the URL with the protocol.
     * @param requestConfig the configuration to use for HTTP requests
     * @private
     */
    private static async checkUrlWithProtocol(requestConfig: RequestOptions): Promise<boolean> {
        let urlResult = UrlUtils.cache[<string>requestConfig.uri];
        if (urlResult !== undefined) {
            return urlResult;
        }
        let generalConfig = ConfigService.getGeneralSettings();
        requestConfig.proxy = generalConfig.proxy;
        if (generalConfig.allowAllUnauthorizedSSL) {
            requestConfig.rejectUnauthorized = false;
        }
        requestConfig.method = 'HEAD';
        requestConfig.resolveWithFullResponse = true;
        requestConfig.timeout ??= 4000;

        let found = false;
        try {
            let delegate = new RequestDelegate(requestConfig);
            let response: Response = await delegate.doRequest();
            found = response?.status === 200;
        }
        catch (err) {
            let message = err.message;
            // Ignore errors caused by 404 status code and invalid certificates
            if (!message.includes('ERR_TLS_CERT_ALTNAME_INVALID') && !message.includes('ENOTFOUND')) {
                log.warn(`Error occured while testing URL '${requestConfig.uri}'. Original error message was: ${message}`);
            }
        }
        UrlUtils.cache[<string>requestConfig.uri] = found;
        return found;
    }

    /**
     * Map a distribution format to a conform value
     * @param formatArray
     * @param warnings
     */
    static mapFormat(formatArray: string[], warnings?: string[][]): string[] {

        return formatArray.map(format => {
            const value = UrlUtils.formatMapping[format.toLowerCase()];

            if (!value) {
                if (Object.values(UrlUtils.formatMapping).indexOf(format) === -1) {
                    if (ConfigService.getGeneralSettings().mappingLogLevel == 'info') {
                        log.info('Distribution format unknown: ' + format);
                    }
                    else {
                        log.warn('Distribution format unknown: ' + format);
                    }
                    warnings?.push(['Distribution format unknown', format]);
                }
                return format;
            }

            return value;
        });

    }

    static updateFormatMapping() {
        this.formatMapping = this.getFormatMapping();
    }

    private static getFormatMapping() {
        let content: any = fs.readFileSync(this.MAPPINGS_FILE);
        let mapping = JSON.parse(content.toString());

        return Object.keys(mapping.format)
            .reduce((prev, curr) => {
                mapping.format[curr].forEach(value => prev[value.toLowerCase()] = curr);
                return prev;
            }, {});
    }
}
