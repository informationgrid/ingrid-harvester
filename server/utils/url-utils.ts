'use strict';

import {RequestConfig, RequestDelegate} from "./http-request-utils";

let log = require('log4js').getLogger( __filename );

export class UrlUtils {

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
    static async urlWithProtocolFor(requestConfig: RequestConfig): Promise<string> {
        let url = requestConfig.uri;

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
    private static async checkUrlWithProtocol(requestConfig: RequestConfig): Promise<boolean> {
        let found = false;
        try {
            let delegate = new RequestDelegate(requestConfig);
            let callback = (err, resp) => found = resp && resp.statusCode === 200;

            await delegate.doRequest(callback);
            return found;
        } catch(err) {
            let message = err.message;
            // Ignore errors caused by 404 status code and invalid certificates
            if (!message.includes('ERR_TLS_CERT_ALTNAME_INVALID')
                && !message.includes('ENOTFOUND')) {
                log.warn(`Error occured while testing URL '${requestConfig.uri}'. Original error message was: ${message}`);
            }
        }
    }
}
