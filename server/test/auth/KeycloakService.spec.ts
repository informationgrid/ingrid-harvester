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
import session, { MemoryStore } from 'express-session';
import assert from 'node:assert/strict';
import { createHash, createSign, generateKeyPairSync } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import passport from 'passport';
import { AuthCtrl } from '../../app/controllers/AuthCtrl.js';
import { KeycloakCtrl } from '../../app/controllers/keycloak/KeycloakCtrl.js';
import { PassportCtrl } from '../../app/controllers/passport/PassportCtrl.js';
import type { AuthenticatedUser } from '../../app/services/auth/AuthenticatedUser.js';
import { KeycloakService } from '../../app/services/keycloak/KeycloakService.js';
import { PassportLocalService } from '../../app/services/passport/PassportLocalService.js';

let provider: TestProvider;

describe('KeycloakService', () => {

    before(async () => {
        provider = await createProvider();
    });

    after(async () => {
        await provider?.close();
    });

    it('creates authorization-code URLs with PKCE and stores concurrent transactions', async () => {
        const service = createService();
        const req = request();
        const firstUrl = await service.createAuthorizationUrl(req);
        const secondUrl = await service.createAuthorizationUrl(req);
        const firstState = firstUrl.searchParams.get('state')!;
        const secondState = secondUrl.searchParams.get('state')!;

        assert.equal(firstUrl.origin, provider.origin);
        assert.equal(firstUrl.searchParams.get('response_type'), 'code');
        assert.equal(firstUrl.searchParams.get('code_challenge_method'), 'S256');
        assert.match(firstUrl.searchParams.get('code_challenge')!, /^[A-Za-z0-9_-]{43}$/);
        assert.equal(firstUrl.searchParams.get('redirect_uri'), 'http://harvester.example.org/rest/auth/keycloak/callback');
        assert.notEqual(firstState, secondState);
        assert.equal(Object.keys(req.session.oidcStates!).length, 2);
    });

    it('prunes expired transactions when starting a new login', async () => {
        const service = createService();
        const req = request();
        const firstUrl = await service.createAuthorizationUrl(req);
        const expiredState = firstUrl.searchParams.get('state')!;
        req.session.oidcStates![expiredState].createdAt = Date.now() - 16 * 60 * 1000;

        const secondUrl = await service.createAuthorizationUrl(req);

        assert.equal(req.session.oidcStates![expiredState], undefined);
        assert.ok(req.session.oidcStates![secondUrl.searchParams.get('state')!]);
    });

    it('exchanges the code using PKCE and validates state and nonce before creating a normalized user', async () => {
        const service = createService();
        const req = request();
        const authorizationUrl = await service.createAuthorizationUrl(req);
        const code = provider.issueCode(authorizationUrl, ['admin', 'editor', 'admin']);
        const state = authorizationUrl.searchParams.get('state')!;
        setCallback(req, code, state);

        const user = await service.completeLogin(req);

        assert.equal(user.username, 'alice');
        assert.equal(user.email, 'alice@example.org');
        assert.equal(user.name, 'Alice Example');
        assert.deepEqual(user.roles, ['admin', 'editor']);
        assert.equal(user.authMethod, 'keycloak');
        assert.equal(user.keycloak?.subject, 'subject-123');
        assert.ok(user.keycloak?.expiresAt! > Date.now());
        assert.equal(req.session.oidcStates![state], undefined);
    });

    it('rejects missing, invalid, and expired state and removes a consumed transaction', async () => {
        const service = createService();
        const req = request();
        await assert.rejects(service.completeLogin(req));

        req.query = {state: 'unknown', code: 'code'} as any;
        await assert.rejects(service.completeLogin(req));

        const authorizationUrl = await service.createAuthorizationUrl(req);
        const expiredState = authorizationUrl.searchParams.get('state')!;
        req.session.oidcStates![expiredState].createdAt = Date.now() - 16 * 60 * 1000;
        setCallback(req, 'unused', expiredState);
        await assert.rejects(service.completeLogin(req));
        assert.equal(req.session.oidcStates![expiredState], undefined);
    });

    it('rejects an ID token with a nonce that does not match the stored transaction', async () => {
        const service = createService();
        const req = request();
        const authorizationUrl = await service.createAuthorizationUrl(req);
        const state = authorizationUrl.searchParams.get('state')!;
        const code = provider.issueCode(authorizationUrl, ['admin'], 'wrong-nonce');
        setCallback(req, code, state);

        await assert.rejects(service.completeLogin(req));
        assert.equal(req.session.oidcStates![state], undefined);
    });

    it('refreshes only expired Keycloak users and updates the Passport session', async () => {
        const service = createService();
        const user: AuthenticatedUser = {
            username: 'alice',
            roles: ['admin'],
            authMethod: 'keycloak',
            keycloak: {
                subject: 'subject-123',
                accessToken: 'expired-access',
                refreshToken: 'refresh-token',
                expiresAt: Date.now() - 1000
            }
        };
        const req = request();
        req.user = user as any;
        (req.session as any).passport = {user};
        (req.session as any).save = (done: (error?: Error) => void) => done();

        await service.ensureFreshUser(req);

        const refreshed = req.user as AuthenticatedUser;
        assert.deepEqual(refreshed.roles, ['viewer']);
        assert.equal(refreshed.keycloak?.refreshToken, 'rotated-refresh-token');
        assert.ok(refreshed.keycloak?.expiresAt! > Date.now());
        assert.equal((req.session as any).passport.user.keycloak.accessToken, refreshed.keycloak?.accessToken);
        assert.notEqual(refreshed.keycloak?.accessToken, 'expired-access');
    });

    it('clears the Keycloak session when refresh fails with invalid_grant', async () => {
        const service = createService();
        const req = request();
        const user: AuthenticatedUser = {
            username: 'alice',
            roles: ['admin'],
            authMethod: 'keycloak',
            keycloak: {
                subject: 'subject-123',
                accessToken: 'expired-access',
                refreshToken: 'invalid-refresh-token',
                expiresAt: Date.now() - 1000
            }
        };
        req.user = user as any;
        (req as any).logout = (done: (error?: Error) => void) => done();
        let destroyed = false;
        (req.session as any).destroy = (done: (error?: Error) => void) => {
            destroyed = true;
            done();
        };

        await assert.rejects(service.ensureFreshUser(req), /Keycloak session expired/);
        assert.equal(destroyed, true);
    });

    it('revokes a Keycloak refresh token during logout', async () => {
        const service = createService();
        await service.logout({
            username: 'alice',
            roles: [],
            authMethod: 'keycloak',
            keycloak: {subject: 'subject-123', accessToken: 'access', refreshToken: 'refresh-token'}
        });

        assert.equal(provider.revokedRefreshToken, 'refresh-token');
    });

    it('builds a Keycloak end-session URL with post-logout redirect and ID token hint', async () => {
        const service = createService();
        const logoutUrl = new URL(await service.buildLogoutUrl(request(), 'id-token'));

        assert.equal(`${logoutUrl.origin}${logoutUrl.pathname}`, `${provider.origin}/logout`);
        assert.equal(logoutUrl.searchParams.get('client_id'), 'harvester');
        assert.equal(logoutUrl.searchParams.get('post_logout_redirect_uri'), 'http://harvester.example.org/login');
        assert.equal(logoutUrl.searchParams.get('id_token_hint'), 'id-token');

        const withoutHint = new URL(await service.buildLogoutUrl(request()));
        assert.equal(withoutHint.searchParams.has('id_token_hint'), false);
    });

    it('falls back to the application login page when Keycloak logout URL discovery fails', async () => {
        const service = createService();
        (service as any).getClientConfiguration = () => Promise.reject(new Error('discovery failed'));
        const warn = console.warn;
        console.warn = () => {};
        try {
            assert.equal(await service.buildLogoutUrl(request(), 'id-token'), 'http://harvester.example.org/login');
        } finally {
            console.warn = warn;
        }
    });

    it('preserves local routes and regenerates the Keycloak session before exposing a token-free auth check', async () => {
        const previousBaseUrl = process.env.BASE_URL;
        process.env.BASE_URL = '/subpath';
        const service = createService();
        const keycloakCtrl = new KeycloakCtrl(service);
        const passportCtrl = new PassportCtrl();
        const authCtrl = new AuthCtrl();
        const localService = new PassportLocalService(
            {findByCredential: async (username: string, password: string) => username === 'admin' && password === 'password' ? {
                username,
                firstName: 'Local',
                lastName: 'Admin',
                password: 'stored-hash',
                roles: []
            } : undefined} as any,
            {get: () => ({})} as any,
            {use: () => {}} as any
        );
        localService.initializeLogin();

        const app = express();
        app.use(express.json());
        app.use(session({
            secret: 'auth-test-secret',
            resave: false,
            saveUninitialized: true,
            store: new MemoryStore(),
            cookie: {path: '/subpath', httpOnly: true}
        }));
        app.use(passport.initialize());
        app.use(passport.session());
        app.post('/subpath/rest/passport/login', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
            try {
                res.json(await passportCtrl.login(req.body.username, req.body.password, req, res));
            } catch (error) {
                next(error);
            }
        });
        app.get('/subpath/rest/passport/logout', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
            try {
                res.send(await passportCtrl.logout(req, res));
            } catch (error) {
                next(error);
            }
        });
        app.get('/subpath/rest/auth/check', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
            try {
                res.json(await authCtrl.check(req));
            } catch (error) {
                next(error);
            }
        });
        app.get('/subpath/rest/auth/keycloak/login', (req: express.Request, res: express.Response, next: express.NextFunction) => keycloakCtrl.login(req, res, next));
        app.get('/subpath/rest/auth/keycloak/callback', (req: express.Request, res: express.Response) => void keycloakCtrl.callback(req, res));
        app.get('/subpath/rest/auth/keycloak/logout', (req: express.Request, res: express.Response) => void keycloakCtrl.logout(req, res));
        app.use((error: any, _req: any, res: any, _next: any) => res.status(error.status ?? 500).send(error.message));

        const server = app.listen(0);
        await new Promise<void>(resolve => server.once('listening', resolve));
        const address = server.address() as AddressInfo;
        const baseUrl = `http://127.0.0.1:${address.port}/subpath`;
        try {
            const localLogin = await fetch(`${baseUrl}/rest/passport/login`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username: 'admin', password: 'password'}),
                redirect: 'manual'
            });
            assert.equal(localLogin.status, 200);
            const localBody = await localLogin.json() as any;
            assert.equal(localBody.authMethod, 'local');
            assert.equal('password' in localBody, false);
            assert.equal('keycloak' in localBody, false);
            const localCookie = cookieValue(localLogin);
            const localCheck = await fetch(`${baseUrl}/rest/auth/check`, {headers: {cookie: localCookie}});
            assert.equal((await localCheck.json() as any).authMethod, 'local');

            const localLogout = await fetch(`${baseUrl}/rest/passport/logout`, {headers: {cookie: localCookie}, redirect: 'manual'});
            assert.equal(await localLogout.text(), 'Disconnected');
            assert.match(localLogout.headers.get('set-cookie')!, /Path=\/subpath/);

            const startKeycloakLogin = async () => {
                const login = await fetch(`${baseUrl}/rest/auth/keycloak/login`, {redirect: 'manual'});
                assert.equal(login.status, 302);
                const authorizationUrl = new URL(login.headers.get('location')!);
                return {cookie: cookieValue(login), authorizationUrl, state: authorizationUrl.searchParams.get('state')!};
            };
            const consoleWarn = console.warn;
            console.warn = () => {};
            try {
                const noRole = await startKeycloakLogin();
                const noRoleCallbackUrl = new URL(noRole.authorizationUrl.searchParams.get('redirect_uri')!);
                noRoleCallbackUrl.searchParams.set('code', provider.issueCode(noRole.authorizationUrl, ['other']));
                noRoleCallbackUrl.searchParams.set('state', noRole.state);
                const noRoleCallback = await fetch(noRoleCallbackUrl, {headers: {cookie: noRole.cookie}, redirect: 'manual'});
                assert.equal(noRoleCallback.status, 302);
                assert.equal(noRoleCallback.headers.get('location'), '/subpath/login?error=no_permission');
                assert.equal((await fetch(`${baseUrl}/rest/auth/check`, {headers: {cookie: noRole.cookie}})).status, 401);

                const denied = await startKeycloakLogin();
                const deniedCallbackUrl = new URL(denied.authorizationUrl.searchParams.get('redirect_uri')!);
                deniedCallbackUrl.searchParams.set('error', 'access_denied');
                deniedCallbackUrl.searchParams.set('state', denied.state);
                const deniedCallback = await fetch(deniedCallbackUrl, {headers: {cookie: denied.cookie}, redirect: 'manual'});
                assert.equal(deniedCallback.status, 302);
                assert.equal(deniedCallback.headers.get('location'), '/subpath/login?error=no_permission');
            } finally {
                console.warn = consoleWarn;
            }

            const consoleError = console.error;
            console.error = () => {};
            try {
                const invalidState = await startKeycloakLogin();
                const invalidCallbackUrl = new URL(invalidState.authorizationUrl.searchParams.get('redirect_uri')!);
                invalidCallbackUrl.searchParams.set('code', 'code');
                invalidCallbackUrl.searchParams.set('state', 'unknown');
                const invalidCallback = await fetch(invalidCallbackUrl, {headers: {cookie: invalidState.cookie}, redirect: 'manual'});
                assert.equal(invalidCallback.status, 302);
                assert.equal(invalidCallback.headers.get('location'), '/subpath/login?error=keycloak');
            } finally {
                console.error = consoleError;
            }

            const keycloakLogin = await fetch(`${baseUrl}/rest/auth/keycloak/login`, {redirect: 'manual'});
            assert.equal(keycloakLogin.status, 302);
            const oldCookie = cookieValue(keycloakLogin);
            const authorizationUrl = new URL(keycloakLogin.headers.get('location')!);
            const state = authorizationUrl.searchParams.get('state')!;
            const code = provider.issueCode(authorizationUrl, ['admin']);
            const callbackUrl = new URL(authorizationUrl.searchParams.get('redirect_uri')!);
            callbackUrl.searchParams.set('code', code);
            callbackUrl.searchParams.set('state', state);
            const callback = await fetch(callbackUrl, {headers: {cookie: oldCookie}, redirect: 'manual'});
            assert.equal(callback.status, 302);
            const newCookie = cookieValue(callback);
            assert.notEqual(newCookie, oldCookie);
            assert.equal(callback.headers.get('location'), '/subpath');

            const keycloakCheck = await fetch(`${baseUrl}/rest/auth/check`, {headers: {cookie: newCookie}});
            const publicUser = await keycloakCheck.json() as any;
            assert.equal(publicUser.username, 'alice');
            assert.equal(publicUser.authMethod, 'keycloak');
            assert.deepEqual(publicUser.roles, ['admin']);
            assert.equal('password' in publicUser, false);
            assert.equal('accessToken' in publicUser, false);
            assert.equal('refreshToken' in publicUser, false);
            assert.equal('idToken' in publicUser, false);

            const keycloakLogout = await fetch(`${baseUrl}/rest/auth/keycloak/logout`, {headers: {cookie: newCookie}, redirect: 'manual'});
            assert.equal(keycloakLogout.status, 302);
            const endSessionUrl = new URL(keycloakLogout.headers.get('location')!);
            assert.equal(`${endSessionUrl.origin}${endSessionUrl.pathname}`, `${provider.origin}/logout`);
            assert.equal(endSessionUrl.searchParams.get('client_id'), 'harvester');
            assert.equal(endSessionUrl.searchParams.get('post_logout_redirect_uri'), `${baseUrl}/login`);
            assert.ok(endSessionUrl.searchParams.get('id_token_hint'));
            assert.match(keycloakLogout.headers.get('set-cookie')!, /Path=\/subpath/);
            assert.equal(provider.revokedRefreshToken, 'refresh-token');
            assert.equal((await fetch(`${baseUrl}/rest/auth/check`, {headers: {cookie: newCookie}})).status, 401);
        } finally {
            const closed = new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
            server.closeAllConnections();
            await closed;
            if (previousBaseUrl === undefined) delete process.env.BASE_URL;
            else process.env.BASE_URL = previousBaseUrl;
        }
    }).timeout(10000);
});

interface TestProvider {
    origin: string;
    issueCode: (authorizationUrl: URL, roles: string[], nonce?: string) => string;
    revokedRefreshToken?: string;
    close: () => Promise<void>;
}

function createService(): KeycloakService {
    const service = new KeycloakService();
    (service as any).keycloakConfig = {
        realm: 'test',
        'auth-server-url': provider.origin,
        'ssl-required': 'none',
        resource: 'harvester'
    };
    return service;
}

function request(): Request {
    const host = 'harvester.example.org';
    return {
        protocol: 'http',
        host,
        headers: {host},
        get: (name: string) => name.toLowerCase() === 'host' ? host : undefined,
        originalUrl: '/rest/auth/keycloak/callback',
        query: {},
        session: {oidcStates: {}}
    } as unknown as Request;
}

function setCallback(req: Request, code: string, state: string) {
    req.originalUrl = `/rest/auth/keycloak/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
    req.query = {code, state} as any;
}

function createProvider(): Promise<TestProvider> {
    const {privateKey, publicKey} = generateKeyPairSync('rsa', {modulusLength: 2048});
    const kid = 'test-key';
    const publicJwk = publicKey.export({format: 'jwk'}) as JsonWebKey;
    const codes = new Map<string, {challenge: string; redirectUri: string; nonce: string; roles: string[]}>();
    let revokedRefreshToken: string | undefined;
    let server: Server;
    let origin: string;
    let issuer: string;

    const handle = async (request: IncomingMessage, response: ServerResponse) => {
        const url = new URL(request.url!, origin);
        if (request.method === 'GET' && url.pathname === '/realms/test/.well-known/openid-configuration') {
            return json(response, {
                issuer,
                authorization_endpoint: `${origin}/authorize`,
                token_endpoint: `${origin}/token`,
                jwks_uri: `${origin}/jwks`,
                revocation_endpoint: `${origin}/revoke`,
                end_session_endpoint: `${origin}/logout`,
                response_types_supported: ['code'],
                grant_types_supported: ['authorization_code', 'refresh_token'],
                subject_types_supported: ['public'],
                id_token_signing_alg_values_supported: ['RS256'],
                token_endpoint_auth_methods_supported: ['none']
            });
        }
        if (request.method === 'GET' && url.pathname === '/jwks') {
            return json(response, {keys: [{...publicJwk, kid, alg: 'RS256', use: 'sig'}]});
        }
        if (request.method === 'POST' && url.pathname === '/token') {
            const body = new URLSearchParams(await readBody(request));
            if (body.get('grant_type') === 'authorization_code') {
                const code = body.get('code')!;
                const grant = codes.get(code);
                const challenge = createHash('sha256').update(body.get('code_verifier')!).digest('base64url');
                if (!grant || challenge !== grant.challenge || body.get('redirect_uri') !== grant.redirectUri) {
                    return json(response, {error: 'invalid_grant'}, 400);
                }
                codes.delete(code);
                return json(response, {
                    access_token: jwt({resource_access: {harvester: {roles: grant.roles}}}),
                    token_type: 'Bearer',
                    expires_in: 3600,
                    refresh_token: 'refresh-token',
                    id_token: signIdToken(privateKey, kid, issuer, grant.nonce)
                });
            }
            if (body.get('grant_type') === 'refresh_token' && body.get('refresh_token') === 'refresh-token') {
                return json(response, {
                    access_token: jwt({resource_access: {harvester: {roles: ['viewer']}}}),
                    token_type: 'Bearer',
                    expires_in: 3600,
                    refresh_token: 'rotated-refresh-token'
                });
            }
            return json(response, {error: 'invalid_grant'}, 400);
        }
        if (request.method === 'POST' && url.pathname === '/revoke') {
            const body = new URLSearchParams(await readBody(request));
            revokedRefreshToken = body.get('token') ?? undefined;
            response.writeHead(200);
            response.end();
            return;
        }
        response.writeHead(404);
        response.end();
    };

    server = createServer((request, response) => {
        void handle(request, response).catch(error => {
            response.writeHead(500);
            response.end(String(error));
        });
    });

    return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address() as AddressInfo;
            origin = `http://127.0.0.1:${address.port}`;
            issuer = `${origin}/realms/test`;
            resolve({
                origin,
                issueCode: (authorizationUrl, roles, nonce) => {
                    const code = `code-${codes.size + 1}-${Math.random().toString(36).slice(2)}`;
                    codes.set(code, {
                        challenge: authorizationUrl.searchParams.get('code_challenge')!,
                        redirectUri: authorizationUrl.searchParams.get('redirect_uri')!,
                        nonce: nonce ?? authorizationUrl.searchParams.get('nonce')!,
                        roles
                    });
                    return code;
                },
                get revokedRefreshToken() { return revokedRefreshToken; },
                close: () => new Promise<void>((closeResolve, closeReject) => server.close(error => error ? closeReject(error) : closeResolve()))
            });
        });
    });
}

function signIdToken(privateKey: any, kid: string, issuer: string, nonce: string): string {
    const now = Math.floor(Date.now() / 1000);
    return signJwt(privateKey, kid, {
        iss: issuer,
        sub: 'subject-123',
        aud: 'harvester',
        iat: now,
        exp: now + 3600,
        nonce,
        preferred_username: 'alice',
        email: 'alice@example.org',
        name: 'Alice Example'
    });
}

function signJwt(privateKey: any, kid: string, claims: Record<string, unknown>): string {
    const header = Buffer.from(JSON.stringify({alg: 'RS256', typ: 'JWT', kid})).toString('base64url');
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const content = `${header}.${payload}`;
    const signer = createSign('RSA-SHA256');
    signer.update(content);
    signer.end();
    return `${content}.${signer.sign(privateKey).toString('base64url')}`;
}

function jwt(claims: Record<string, unknown>): string {
    return `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
}

function readBody(request: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        let body = '';
        request.setEncoding('utf8');
        request.on('data', chunk => body += chunk);
        request.on('end', () => resolve(body));
        request.on('error', reject);
    });
}

function json(response: ServerResponse, body: unknown, status = 200) {
    response.writeHead(status, {'Content-Type': 'application/json'});
    response.end(JSON.stringify(body));
}

function cookieValue(response: Response): string {
    const cookie = response.headers.get('set-cookie');
    assert.ok(cookie);
    return cookie.split(';', 1)[0];
}
