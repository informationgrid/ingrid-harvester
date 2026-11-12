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

import type { Request, Response } from 'express';
import type { LocalUser } from '../users/LocalUser.js';

export interface AuthenticatedUser {
  username: string;
  email?: string;
  name?: string;
  roles: string[];
  authMethod: 'local' | 'keycloak';
  keycloak?: {
    subject: string;
    accessToken: string;
    refreshToken?: string;
    idToken?: string;
    expiresAt?: number;
  };
}

export interface OidcTransaction {
  codeVerifier: string;
  nonce: string;
  callbackUrl: string;
  createdAt: number;
}

declare module 'express-session' {
  interface SessionData {
    oidcStates?: Record<string, OidcTransaction>;
  }
}

export function toLocalUser(user: LocalUser): AuthenticatedUser {
  return {
    username: user.username,
    name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
    // Existing users.json installations omit roles; local accounts intentionally retain their historical admin access.
    roles: user.roles?.length ? [...user.roles] : ['admin'],
    authMethod: 'local'
  };
}

export function toPublicUser(user: AuthenticatedUser): Omit<AuthenticatedUser, 'keycloak'> {
  return {
    username: user.username,
    ...(user.email ? {email: user.email} : {}),
    ...(user.name ? {name: user.name} : {}),
    roles: Array.isArray(user.roles) ? [...user.roles] : [],
    authMethod: user.authMethod
  };
}

export function hasAnyRole(user: AuthenticatedUser, requiredRoles: string[]): boolean {
  return Array.isArray(user.roles) && requiredRoles.some(role => user.roles.includes(role));
}

export function buildCallbackUrl(request: Request, baseURL = process.env.BASE_URL ?? '/', allowHttp = false): string {
  const protocol = request.protocol?.toLowerCase();
  const host = (request as any).host ?? request.get('host') ?? request.headers.host;
  if ((protocol !== 'https' && !(allowHttp && protocol === 'http')) || !host ||
    /[\s\\/%?#@,\u0000-\u001f]/.test(host) || host.endsWith(':')) {
    throw new Error('Invalid public origin for Keycloak callback');
  }

  let origin: URL;
  try {
    origin = new URL(`${protocol}://${host}`);
  } catch {
    throw new Error('Invalid public origin for Keycloak callback');
  }
  if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash || !origin.hostname) {
    throw new Error('Invalid public origin for Keycloak callback');
  }

  const basePath = baseURL.trim() || '/';
  if (/[\\?#\u0000-\u001f]/.test(basePath) || /(^|\/)\.{1,2}(\/|$)/.test(basePath)) {
    throw new Error('Invalid BASE_URL path');
  }
  const base = new URL(basePath.startsWith('/') ? basePath : `/${basePath}`, 'https://base.invalid');
  if (base.origin !== 'https://base.invalid') {
    throw new Error('Invalid BASE_URL path');
  }
  const prefix = base.pathname.replace(/\/$/, '');
  return new URL(`${prefix}/rest/auth/keycloak/callback`, origin).href;
}

export async function logoutRequest(request: Request, response?: Response): Promise<void> {
  let logoutError: Error | undefined;
  try {
    await new Promise<void>((resolve, reject) => {
      request.logout(error => error ? reject(error) : resolve());
    });
  } catch (error) {
    logoutError = error as Error;
  }
  const session = request.session;
  const cookiePath = session?.cookie?.path || '/';
  let destroyError: Error | undefined;
  if (session) {
    try {
      await new Promise<void>((resolve, reject) => {
        session.destroy(error => error ? reject(error) : resolve());
      });
    } catch (error) {
      destroyError = error as Error;
    }
  }
  response?.clearCookie('connect.sid', {path: cookiePath});
  if (destroyError) throw destroyError;
  if (logoutError) throw logoutError;
}
