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

import express from 'express';
import assert from 'node:assert/strict';
import { buildCallbackUrl, buildPostLogoutUrl } from '../../app/services/auth/AuthenticatedUser.js';
import { parseTrustProxy } from '../../app/utils/trust-proxy.utils.js';

describe('trust proxy configuration', () => {
    it('defaults to disabled and parses explicit settings', () => {
        assert.equal(parseTrustProxy(undefined), false);
        assert.equal(parseTrustProxy('  '), false);
        assert.equal(parseTrustProxy('false'), false);
        assert.equal(parseTrustProxy('true'), true);
        assert.equal(parseTrustProxy(' 2 '), 2);
        assert.deepEqual(parseTrustProxy('loopback, 10.0.0.0/8'), ['loopback', '10.0.0.0/8']);
    });

    it('does not trust forwarded headers unless proxy trust is configured', () => {
        const app = express();
        app.set('trust proxy', parseTrustProxy(undefined));
        const req = forwardedRequest(app, '127.0.0.1');

        assert.equal(req.protocol, 'http');
        assert.equal(req.host, 'internal:3000');
        assert.equal(buildCallbackUrl(req, '/', true), 'http://internal:3000/rest/auth/keycloak/callback');
        assert.equal(buildPostLogoutUrl(req, '/', true), 'http://internal:3000/login');
        assert.throws(() => buildCallbackUrl(req));
    });

    it('uses the forwarded public origin only from an explicitly trusted proxy', () => {
        const app = express();
        app.set('trust proxy', parseTrustProxy('loopback'));
        const trustedRequest = forwardedRequest(app, '127.0.0.1');

        assert.equal(buildCallbackUrl(trustedRequest), 'https://harvester.example.org/rest/auth/keycloak/callback');
        assert.equal(buildPostLogoutUrl(trustedRequest), 'https://harvester.example.org/login');

        const untrustedRequest = forwardedRequest(app, '10.0.0.2');
        assert.equal(untrustedRequest.protocol, 'http');
        assert.equal(untrustedRequest.host, 'internal:3000');
        assert.throws(() => buildCallbackUrl(untrustedRequest));
    });
});

function forwardedRequest(app: ReturnType<typeof express>, remoteAddress: string) {
    const req = Object.create(express.request);
    req.app = app;
    req.headers = {
        host: 'internal:3000',
        'x-forwarded-host': 'harvester.example.org',
        'x-forwarded-proto': 'https'
    };
    req.socket = {encrypted: false, remoteAddress};
    req.connection = req.socket;
    return req;
}