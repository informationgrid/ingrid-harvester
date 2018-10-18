'use strict';

let request = require('request-promise'),
    log = require('log4js').getLogger( __filename );

class UrlUtils {

    static async urlWithProtocolFor(url) {
        if (!url && url !== '') return url;
        if (url.trim() !== '') {
            if (url.includes('://')) return url;

            let resp = await UrlUtils._check('https', url);
            if (resp) return resp;

            resp = await UrlUtils._check('http', url);
            if (resp) return resp;
        }

        // By doing nothing return undefined if we reach here
    }

    static async _check(protocol, url) {
        url = `${protocol}://${url}`;
        let found = false;
        try {
            await request({
                    url: url,
                    headers: {'User-Agent': 'mCLOUD Harvester. Request-Promise'}
                },
                (err, resp, body) => {
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


module.exports = UrlUtils;

