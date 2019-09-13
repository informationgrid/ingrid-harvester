import {expect} from "chai";
import {OptionsWithUri} from "request-promise";
import {UrlUtils} from '../app/utils/url.utils';
import {RequestDelegate} from '../app/utils/http-request.utils';

describe('validateUrl()', function () {

    it('should return same string for links containing "://"', function () {
        let input = 'abc://defghi';
        let config = getRequestConfigFor(input);
        return UrlUtils.urlWithProtocolFor(config).then(result => {
            expect(result).to.equal(input);
        });
    });

    it('should prepend https:// if link valid', function () {
        let input = 'www.wemove.com/website/de/';
        let config = getRequestConfigFor(input);
        return UrlUtils.urlWithProtocolFor(config).then(result => {
            expect(result).to.equal(`https://${input}`);
        });
    });

    it('should prepend https:// if redirected link valid', function () {
        let input = 'wemove.com';
        let config = getRequestConfigFor(input);
        return UrlUtils.urlWithProtocolFor(config).then(result => {
            expect(result).to.equal(`https://${input}`);
        });
    });

    it('should prepend http:// if https:// not available but http:// link is valid', function () {
        let input = 'mcloud-qs.wemove.com';
        let config = getRequestConfigFor(input);
        return UrlUtils.urlWithProtocolFor(config).then(result => {
            expect(result).to.equal(`http://${input}`);
        });
    });

    it('should be undefined for links that are not found', function () {
        let input = 'does-not-exist-test.wemove.com';
        let config = getRequestConfigFor(input);
        UrlUtils.urlWithProtocolFor(config).then(result => {
            expect(result).to.be.undefined;
        });
    }).timeout(5000);

    it('should be undefined if url is undefined', function () {
        let config = getRequestConfigFor(undefined);
        return UrlUtils.urlWithProtocolFor(config).then(result => {
            expect(result).to.be.undefined;
        });
    });

    it('should be undefined if url is empty string', function () {
        let input = '';
        let config = getRequestConfigFor(input);
        return UrlUtils.urlWithProtocolFor(config).then(result => {
            expect(result).to.be.undefined;
        });
    });

    it('should be undefined if url only contains whitespace', function () {
        let input = '\t\r\n';
        let config = getRequestConfigFor(input);
        return UrlUtils.urlWithProtocolFor(config).then(result => {
            expect(result).to.be.undefined;
        });
    });
});

function getRequestConfigFor(uri): OptionsWithUri {
    return {
        method: 'GET',
        json: false,
        headers: RequestDelegate.defaultRequestHeaders(),
        qs: {},
        uri: uri
    };
}

