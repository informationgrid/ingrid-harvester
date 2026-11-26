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

import { expect } from 'chai';
import { UrlCheckService } from '../../app/services/statistic/UrlCheckService.js';

describe('UrlCheckService', function () {
    describe('mapErrorMsg', function () {
        it('maps timeout-related errors to ETIMEDOUT', function () {
            expect(UrlCheckService.mapErrorMsg('ETIMEDOUT')).to.equal('ETIMEDOUT');
            expect(UrlCheckService.mapErrorMsg('network timeout at: http://test.de')).to.equal('ETIMEDOUT');
            expect(UrlCheckService.mapErrorMsg('TimeoutError: The operation was aborted due to timeout')).to.equal('ETIMEDOUT');
            expect(UrlCheckService.mapErrorMsg('AbortError: The operation was aborted')).to.equal('ETIMEDOUT');
            expect(UrlCheckService.mapErrorMsg('The operation was aborted due to timeout')).to.equal('ETIMEDOUT');
            expect(UrlCheckService.mapErrorMsg('The operation was aborted')).to.equal('ETIMEDOUT');
        });

        it('maps socket and network errors correctly', function () {
            expect(UrlCheckService.mapErrorMsg('ESOCKETTIMEDOUT')).to.equal('ESOCKETTIMEDOUT');
            expect(UrlCheckService.mapErrorMsg('getaddrinfo ENOTFOUND host')).to.equal('ENOTFOUND');
            expect(UrlCheckService.mapErrorMsg('read ECONNRESET')).to.equal('ECONNRESET');
            expect(UrlCheckService.mapErrorMsg('connect ECONNREFUSED 127.0.0.1:80')).to.equal('ECONNREFUSED');
            expect(UrlCheckService.mapErrorMsg('TypeError [ERR_INVALID_URL]: Invalid URL')).to.equal('ERR_INVALID_URL');
            expect(UrlCheckService.mapErrorMsg('Only absolute URLs are supported')).to.equal('ERR_INVALID_URL');
            expect(UrlCheckService.mapErrorMsg('ERR_UNESCAPED_CHARACTERS in url')).to.equal('ERR_UNESCAPED_CHARACTERS');
            expect(UrlCheckService.mapErrorMsg('maximum redirect reached')).to.equal('Exceeded maxRedirects');
        });

        it('returns original message when not matching mapped patterns', function () {
            expect(UrlCheckService.mapErrorMsg('500 Internal Server Error')).to.equal('500 Internal Server Error');
            expect(UrlCheckService.mapErrorMsg('Custom unmapped error')).to.equal('Custom unmapped error');
        });
    });
});
