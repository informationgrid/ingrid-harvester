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

import type { Request } from 'express';
import express from 'express';
import assert from 'node:assert/strict';
import { buildCallbackUrl, buildPostLogoutUrl, logoutRequest, toLocalUser, toPublicUser } from '../../app/services/auth/AuthenticatedUser.js';

describe('AuthenticatedUser', () => {
    it('normalizes local users without exposing passwords and preserves the legacy admin role', () => {
        const source = {
            username: 'admin',
            firstName: 'Ada',
            lastName: 'Lovelace',
            password: 'secret',
            roles: []
        };

        const user = toLocalUser(source);

        assert.deepEqual(user, {
            username: 'admin',
            name: 'Ada Lovelace',
            roles: ['admin'],
            authMethod: 'local'
        });
        assert.equal('password' in user, false);
        assert.equal(source.password, 'secret');
    });

    it('returns normalized public user fields without Keycloak tokens', () => {
        const user = toPublicUser({
            username: 'alice',
            email: 'alice@example.org',
            name: 'Alice',
            roles: ['admin'],
            authMethod: 'keycloak',
            keycloak: {
                subject: 'subject',
                accessToken: 'access',
                refreshToken: 'refresh',
                idToken: 'id'
            }
        });

        assert.deepEqual(user, {
            username: 'alice',
            email: 'alice@example.org',
            name: 'Alice',
            roles: ['admin'],
            authMethod: 'keycloak'
        });
        assert.equal('keycloak' in user, false);
    });

    it('builds root and subpath callback URLs', () => {
        assert.equal(buildCallbackUrl(request('https', 'harvester.example.org')), 'https://harvester.example.org/rest/auth/keycloak/callback');
        assert.equal(buildCallbackUrl(request('https', 'harvester.example.org'), '/harvester/'), 'https://harvester.example.org/harvester/rest/auth/keycloak/callback');
        assert.equal(buildCallbackUrl(request('https', 'harvester.example.org:443')), 'https://harvester.example.org/rest/auth/keycloak/callback');
        assert.equal(buildCallbackUrl(request('http', 'localhost:3000'), '/', true), 'http://localhost:3000/rest/auth/keycloak/callback');
        assert.throws(() => buildCallbackUrl(request('http', 'harvester.example.org')));
    });

    it('builds root and subpath post-logout URLs', () => {
        assert.equal(buildPostLogoutUrl(request('https', 'harvester.example.org')), 'https://harvester.example.org/login');
        assert.equal(buildPostLogoutUrl(request('https', 'harvester.example.org'), '/harvester/'), 'https://harvester.example.org/harvester/login');
        assert.equal(buildPostLogoutUrl(request('http', 'localhost:3000'), '/', true), 'http://localhost:3000/login');
        assert.throws(() => buildPostLogoutUrl(request('http', 'harvester.example.org')));
        assert.throws(() => buildPostLogoutUrl(request('https', 'trusted.example.org@attacker.example')));
    });

    it('uses only Express-trusted forwarded protocol and host values', () => {
        const app = express();
        app.set('trust proxy', true);
        const proxyRequest = Object.create(express.request);
        proxyRequest.app = app;
        proxyRequest.headers = {
            host: 'internal:3000',
            'x-forwarded-host': 'public.example.org',
            'x-forwarded-proto': 'https'
        };
        proxyRequest.socket = {encrypted: false, remoteAddress: '127.0.0.1'};
        proxyRequest.connection = proxyRequest.socket;

        assert.equal(buildCallbackUrl(proxyRequest as Request, '/subpath'), 'https://public.example.org/subpath/rest/auth/keycloak/callback');
    });

    it('rejects malformed or injected host values', () => {
        assert.throws(() => buildCallbackUrl(request('https', 'trusted.example.org@attacker.example')));
        assert.throws(() => buildCallbackUrl(request('https', 'bad.example.org/path')));
        assert.throws(() => buildCallbackUrl(request('https', 'harvester.example.org'), '/../other'));
    });

    it('logs out Passport, destroys the session, and clears the cookie on the session path', async () => {
        const calls: any[] = [];
        const session = {
            cookie: {path: '/subpath'},
            destroy: (done: (error?: Error) => void) => done()
        };
        const req = {
            logout: (done: (error?: Error) => void) => done(),
            session
        } as unknown as Request;
        const response = {clearCookie: (...args: any[]) => calls.push(args)} as any;

        await logoutRequest(req, response);

        assert.deepEqual(calls, [['connect.sid', {path: '/subpath'}]]);
    });

    it('still destroys and clears the session when Passport logout reports an error', async () => {
        let destroyed = false;
        const calls: any[] = [];
        const req = {
            logout: (done: (error?: Error) => void) => done(new Error('passport logout failed')),
            session: {
                cookie: {path: '/subpath'},
                destroy: (done: (error?: Error) => void) => {
                    destroyed = true;
                    done();
                }
            }
        } as unknown as Request;
        const response = {clearCookie: (...args: any[]) => calls.push(args)} as any;

        await assert.rejects(logoutRequest(req, response), /passport logout failed/);
        assert.equal(destroyed, true);
        assert.deepEqual(calls, [['connect.sid', {path: '/subpath'}]]);
    });
});

function request(protocol: string, host: string): Request {
    return {
        protocol,
        host,
        headers: {host},
        get: (name: string) => name.toLowerCase() === 'host' ? host : undefined
    } as unknown as Request;
}
