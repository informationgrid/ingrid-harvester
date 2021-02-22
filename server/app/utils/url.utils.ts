'use strict';

import {RequestDelegate} from "./http-request.utils";
import {OptionsWithUri} from "request-promise";
import * as fs from "fs";

let log = require('log4js').getLogger(__filename);

export class UrlUtils {

    private static MAPPINGS_FILE = "mappings.json";

    static cache: { [url: string]: boolean } = {};

    private static formatMapping = UrlUtils.getFormatMapping();

    /**
     * Rudimentary checks for URL validity. This method extracts the request
     * URI from the given configuration, and returns
     * - this URI unmodified if it contains the substring '://'
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
    static async urlWithProtocolFor(requestConfig: OptionsWithUri): Promise<string> {
        let url = <string>requestConfig.uri;

        if (url && url.trim()) {
            // we assume that an URL which contains '://' also has a protocol and is valid
            if (url.includes('://')) return url;

            // if URL is just a domain name with no protocol then first check if 'https://' works
            let urlToCheck = `https://${url}`;
            requestConfig.uri = urlToCheck;
            if (await UrlUtils.checkUrlWithProtocol(requestConfig)) {
                return urlToCheck;
            }

            // otherwise try with 'http://'
            urlToCheck = `http://${url}`;
            requestConfig.uri = urlToCheck;
            if (await UrlUtils.checkUrlWithProtocol(requestConfig)) {
                return urlToCheck;
            }
        }

        // By doing nothing return undefined if we reach here
        return undefined;
    }

    /**
     * Test the given protocol with a URL. If the URL is reachable
     * then return the URL with the protocol.
     * @param requestConfig the configuration to use for HTTP requests
     * @private
     */
    private static async checkUrlWithProtocol(requestConfig: OptionsWithUri): Promise<boolean> {
        let urlResult = UrlUtils.cache[<string>requestConfig.uri];
        if (urlResult !== undefined) {
            return urlResult;
        }

        let found = false;
        try {
            let delegate = new RequestDelegate(requestConfig);
            let callback = (err, resp) => found = resp && resp.statusCode === 200;

            await delegate.doRequest(callback);
            UrlUtils.cache[<string>requestConfig.uri] = found;
            return found;
        } catch (err) {
            let message = err.message;
            // Ignore errors caused by 404 status code and invalid certificates
            if (!message.includes('ERR_TLS_CERT_ALTNAME_INVALID')
                && !message.includes('ENOTFOUND')) {
                log.warn(`Error occured while testing URL '${requestConfig.uri}'. Original error message was: ${message}`);
            }
            UrlUtils.cache[<string>requestConfig.uri] = false;
        }
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
                    log.warn('Distribution format unknown: ' + format);
                    if (warnings) {
                        warnings.push(['Distribution format unknown', format]);
                    }
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
