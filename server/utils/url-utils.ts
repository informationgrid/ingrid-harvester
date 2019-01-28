'use strict';

let request = require('request-promise'),
    log = require('log4js').getLogger( __filename );

export class UrlUtils {

    /**
     * Check an URL if it's valid. If there's no protocol then check if https
     * or http works.
     * @param url
     * @returns a valid URL with protocol https or http
     */
    static async urlWithProtocolFor(url): Promise<string> {
        if (!url && url !== '') return url;
        if (url.trim() !== '') {
            // we assume that an URL which contains '://' also has a protocol and is valid
            if (url.includes('://')) return url;

            // if URL is just a domain name with no protocol then first check if 'https://' works
            let resp = await UrlUtils._check('https', url);
            if (resp) return resp;

            // otherwise try with 'http://'
            resp = await UrlUtils._check('http', url);
            if (resp) return resp;
        }

        // By doing nothing return undefined if we reach here
        return null;
    }

    /**
     * Test the given protocol with a URL. If the URL is reachable
     * then return the URL with the protocol.
     * @param protocol, which can be 'http' or 'https'
     * @param url is the URL (without a protocol) to be checked
     * @private
     */
    static async _check(protocol, url): Promise<string> {
        url = `${protocol}://${url}`;
        let found = false;
        try {
            await request({
                url: url,
                headers: {'User-Agent': 'mCLOUD Harvester. Request-Promise'}
            }, (err, resp) => {
                if (resp && resp.statusCode === 200) found = true;
            });
            if (found) return url;
        } catch(err) {
            let message = err.message;
            // Ignore errors caused by 404 status code and invalid certificates
            if (!message.includes('ERR_TLS_CERT_ALTNAME_INVALID')
                && !message.includes('ENOTFOUND')) {
                log.warn(`Error occured while testing URL '${url}'. Original error message was: ${message}`);
            }
        }
    }
}
