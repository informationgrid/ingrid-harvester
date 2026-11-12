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

import { Service } from '@tsed/di';
import { Unauthorized } from '@tsed/exceptions';
import type { Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import * as oidc from 'openid-client';
import passport from 'passport';
import type { AuthenticatedUser, OidcTransaction } from '../auth/AuthenticatedUser.js';
import { buildCallbackUrl, buildPostLogoutUrl, logoutRequest } from '../auth/AuthenticatedUser.js';
import { KeycloakStrategy } from './KeycloakStrategy.js';

export interface KeycloakConfig {
    realm: string;
    'auth-server-url': string;
    'ssl-required'?: string;
    resource: string;
    credentials?: { secret?: string };
    'confidential-port'?: number;
}

const OIDC_TRANSACTION_TTL = 15 * 60 * 1000;

@Service()
export class KeycloakService {
    private readonly keycloakConfig = loadKeycloakConfig();
    private clientConfiguration?: Promise<oidc.Configuration>;

    constructor() {
        passport.use('keycloak', new KeycloakStrategy(this));
    }

    public getConfig(): KeycloakConfig {
        return this.keycloakConfig;
    }

    public getClientConfiguration(): Promise<oidc.Configuration> {
        if (!this.clientConfiguration) {
            const config = this.keycloakConfig;
            const issuer = new URL(`${config['auth-server-url'].replace(/\/+$/, '')}/realms/${encodeURIComponent(config.realm)}`);
            const secret = config.credentials?.secret;
            this.clientConfiguration = oidc.discovery(
                issuer,
                config.resource,
                secret ? {client_secret: secret} : undefined,
                secret ? oidc.ClientSecretPost(secret) : oidc.None(),
                config['ssl-required']?.toLowerCase() === 'none' ? {execute: [oidc.allowInsecureRequests]} : undefined
            );
        }
        return this.clientConfiguration;
    }

    public async createAuthorizationUrl(request: Request): Promise<URL> {
        if (!request.session) {
            throw new Unauthorized('Session required for Keycloak login');
        }

        const now = Date.now();
        const transactions = request.session.oidcStates ??= {};
        for (const [state, transaction] of Object.entries(transactions)) {
            if (now - transaction.createdAt > OIDC_TRANSACTION_TTL) {
                delete transactions[state];
            }
        }

        const state = oidc.randomState();
        const nonce = oidc.randomNonce();
        const codeVerifier = oidc.randomPKCECodeVerifier();
        const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
        const callbackUrl = buildCallbackUrl(
            request,
            process.env.BASE_URL ?? '/',
            this.keycloakConfig['ssl-required']?.toLowerCase() === 'none'
        );
        transactions[state] = {codeVerifier, nonce, callbackUrl, createdAt: now};

        const config = await this.getClientConfiguration();
        return oidc.buildAuthorizationUrl(config, {
            client_id: this.keycloakConfig.resource,
            redirect_uri: callbackUrl,
            response_type: 'code',
            scope: 'openid profile email',
            state,
            nonce,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256'
        });
    }

    public async completeLogin(request: Request): Promise<AuthenticatedUser> {
        const state = typeof request.query.state === 'string' ? request.query.state : undefined;
        const transactions = request.session?.oidcStates;
        const transaction: OidcTransaction | undefined = state ? transactions?.[state] : undefined;
        if (state && transactions) {
            delete transactions[state];
        }
        if (!state || !transaction || Date.now() - transaction.createdAt > OIDC_TRANSACTION_TTL) {
            throw new Unauthorized('Invalid or expired Keycloak login state');
        }
        if (request.query.error) {
            throw new Unauthorized('Keycloak login was not completed');
        }

        const callbackUrl = new URL(transaction.callbackUrl);
        const callbackRequestUrl = new URL(request.originalUrl, callbackUrl);
        if (callbackRequestUrl.origin !== callbackUrl.origin || callbackRequestUrl.pathname !== callbackUrl.pathname) {
            throw new Unauthorized('Invalid Keycloak callback URL');
        }

        const config = await this.getClientConfiguration();
        const tokens = await oidc.authorizationCodeGrant(config, callbackRequestUrl, {
            pkceCodeVerifier: transaction.codeVerifier,
            expectedState: state,
            expectedNonce: transaction.nonce,
            idTokenExpected: true
        });
        const claims = tokens.claims();
        if (!claims.sub) {
            throw new Unauthorized('Keycloak ID token has no subject');
        }

        return {
            username: stringClaim(claims.preferred_username) ?? String(claims.sub),
            email: stringClaim(claims.email),
            name: stringClaim(claims.name),
            roles: this.extractRoles(decodeJwtClaims(tokens.access_token)),
            authMethod: 'keycloak',
            keycloak: {
                subject: String(claims.sub),
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                idToken: tokens.id_token,
                expiresAt: typeof tokens.expires_in === 'number' ? Date.now() + tokens.expires_in * 1000 : undefined
            }
        };
    }

    public extractRoles(tokenClaims: Record<string, any> | undefined): string[] {
        const roles = tokenClaims?.resource_access?.[this.keycloakConfig.resource]?.roles;
        return Array.isArray(roles) ? [...new Set(roles.filter((role: unknown): role is string => typeof role === 'string'))] : [];
    }

    public async buildLogoutUrl(request: Request, idToken?: string): Promise<string> {
        const postLogoutRedirectUri = buildPostLogoutUrl(
            request,
            process.env.BASE_URL ?? '/',
            this.keycloakConfig['ssl-required']?.toLowerCase() === 'none'
        );

        try {
            const config = await this.getClientConfiguration();
            return oidc.buildEndSessionUrl(config, {
                client_id: this.keycloakConfig.resource,
                post_logout_redirect_uri: postLogoutRedirectUri,
                ...(idToken ? {id_token_hint: idToken} : {})
            }).href;
        } catch (error) {
            console.warn('Keycloak logout URL discovery failed; redirecting to application login', error);
            return postLogoutRedirectUri;
        }
    }

    public async ensureFreshUser(request: Request, response?: Response): Promise<void> {
        const user = request.user as AuthenticatedUser | undefined;
        if (user?.authMethod !== 'keycloak' || !user.keycloak?.expiresAt || user.keycloak.expiresAt > Date.now()) {
            return;
        }

        if (!user.keycloak.refreshToken) {
            await logoutRequest(request, response);
            throw new Unauthorized('Keycloak session expired, please login again');
        }

        try {
            const config = await this.getClientConfiguration();
            const tokens = await oidc.refreshTokenGrant(config, user.keycloak.refreshToken);
            const refreshed: AuthenticatedUser = {
                ...user,
                roles: this.extractRoles(decodeJwtClaims(tokens.access_token)),
                keycloak: {
                    ...user.keycloak,
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token ?? user.keycloak.refreshToken,
                    idToken: tokens.id_token ?? user.keycloak.idToken,
                    expiresAt: typeof tokens.expires_in === 'number' ? Date.now() + tokens.expires_in * 1000 : undefined
                }
            };
            request.user = refreshed;
            if (request.session?.passport) {
                (request.session.passport as any).user = refreshed;
                await new Promise<void>((resolve, reject) => {
                    request.session.save(error => error ? reject(error) : resolve());
                });
            }
        } catch (error: any) {
            if (error?.error === 'invalid_grant' || error?.code === 'invalid_grant') {
                await logoutRequest(request, response);
                throw new Unauthorized('Keycloak session expired, please login again');
            }
            throw error;
        }
    }

    public async logout(user: AuthenticatedUser | undefined): Promise<void> {
        const refreshToken = user?.authMethod === 'keycloak' ? user.keycloak?.refreshToken : undefined;
        if (!refreshToken) return;

        try {
            const config = await this.getClientConfiguration();
            await oidc.tokenRevocation(config, refreshToken, {token_type_hint: 'refresh_token'});
        } catch (error) {
            console.warn('Keycloak token revocation failed during logout', error);
        }
    }
}

function loadKeycloakConfig(): KeycloakConfig {
    const configPath = path.resolve(process.cwd(), 'keycloak.json');
    const raw = fs.readFileSync(configPath, 'utf8').replace(/\$\{env\.([A-Za-z0-9_]+)(?::([^}]*))?}/g,
        (_placeholder, name: string, defaultValue?: string) => process.env[name] ?? defaultValue ?? '');
    const config = JSON.parse(raw) as KeycloakConfig;
    if (!config.realm || !config['auth-server-url'] || !config.resource) {
        throw new Error(`Invalid Keycloak configuration in ${configPath}`);
    }
    return config;
}

function decodeJwtClaims(token?: string): Record<string, any> | undefined {
    if (!token) return undefined;
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return undefined;
        return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    } catch {
        return undefined;
    }
}

function stringClaim(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
}
