/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or – as soon they will be
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

import {expect} from "chai";
import {OptionsWithUri} from "request-promise";
import {UrlUtils} from '../app/utils/url.utils';
import {RequestDelegate} from '../app/utils/http-request.utils';

describe('validateUrl()', function () {

    this.timeout(10000);

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
        let input = '134.245.19.83'; //Scharbeutz-Data-Server
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

