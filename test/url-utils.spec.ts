import {UrlUtils} from "../server/utils/url-utils";
import {expect} from "chai";

describe('validateUrl()', function() {

    it('should return same string for links containing "://"', function() {
        let input = 'abc://defghi';
        return UrlUtils.urlWithProtocolFor(input).then(result => {
            expect(result).to.equal(input);
        });
    });

    it('should prepend https:// if link valid', function() {
        let input = 'www.wemove.com/website/de/';
        return UrlUtils.urlWithProtocolFor(input).then(result => {
            expect(result).to.equal(`https://${input}`);
        });
    });

    it('should prepend https:// if redirected link valid', function() {
        let input = 'wemove.com';
        return UrlUtils.urlWithProtocolFor(input).then(result => {
            expect(result).to.equal(`https://${input}`);
        });
    });

    it('should prepend http:// if https:// not available but http:// link is valid', function() {
        let input = 'mcloud-qs.wemove.com';
        return UrlUtils.urlWithProtocolFor(input).then(result => {
            expect(result).to.equal(`http://${input}`);
        });
    });

    it('should be undefined for links that are not found', function() {
        let input = 'does-not-exist-test.wemove.com';
        return UrlUtils.urlWithProtocolFor(input).then(result => {
            expect(result).to.be.undefined;
        });
    });

    it('should be undefined if url is undefined', function() {
        return UrlUtils.urlWithProtocolFor(undefined).then(result => {
            expect(result).to.be.undefined;
        });
    });

    it('should be undefined if url is empty string', function() {
        return UrlUtils.urlWithProtocolFor('').then(result => {
            expect(result).to.be.undefined;
        });
    });

    it('should be undefined if url only contains whitespace', function() {
        return UrlUtils.urlWithProtocolFor('\t\r\n').then(result => {
            expect(result).to.be.undefined;
        });
    });
});

