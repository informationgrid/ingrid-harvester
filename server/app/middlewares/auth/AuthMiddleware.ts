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


import {Context, Inject, Middleware, type MiddlewareMethods, Req} from "@tsed/common";
import {KeycloakService} from "../../services/keycloak/KeycloakService.js";
import {Unauthorized} from "@tsed/exceptions";
import type {KeycloakAuthOptions} from "../../decorators/KeycloakAuthOptions.js";

@Middleware()
export class AuthMiddleware implements MiddlewareMethods {
  @Inject()
  protected keycloakService: KeycloakService;

  public async use(@Req() request: Express.Request, @Context() ctx: Context) {
    const options: KeycloakAuthOptions = ctx.endpoint.store.get(AuthMiddleware) || {};
    const keycloak = this.keycloakService.getKeycloakInstance();

    // Allow Passport authenticated users
    if (request.isAuthenticated && request.isAuthenticated()) {
      return;
    }

    // 1. Try to recover token from session
    if (request.session && request.session['keycloak-token']) {
      try {
        let tokenData = request.session['keycloak-token'];
        if (typeof tokenData === 'string' && tokenData.startsWith('{')) {
          tokenData = JSON.parse(tokenData);
        }
        const accessToken = typeof tokenData === 'string' ? tokenData : (tokenData.token || tokenData.access_token);
        this.keycloakService.setToken(accessToken);
      } catch (e) {
        console.error('Error parsing token from session:', e);
      }
    }

    // 2. Check if keycloak-connect already authenticated the request
    let grant = ctx.getRequest().kauth?.grant;
    if (grant) {
      this.keycloakService.setToken(grant.access_token);
      // Store tokens in session for BFF
      if (request.session) {
        request.session['keycloak-token'] = grant.__raw || JSON.stringify(grant);
        request.session['keycloak-refresh-token'] = JSON.stringify(grant.refresh_token);
      }
    } else if (request.session && request.session['keycloak-token']) {
      try {
        let tokenData = request.session['keycloak-token'];
        if (typeof tokenData === 'string' && !tokenData.startsWith('{')) {
          // It's a raw JWT string, wrap it in a grant-like object
          tokenData = {
            access_token: tokenData,
            refresh_token: request.session['keycloak-refresh-token'] ? JSON.parse(request.session['keycloak-refresh-token']) : undefined
          };
        }

        // Use grantManager to create a grant from the token data.
        // This ensures the token is a proper Keycloak Token object with hasRole methods.
        // If the access token is expired, createGrant will automatically attempt to refresh it
        // using the refresh token (if provided).
        let grantObj: any;
        try {
          grantObj = await keycloak.grantManager.createGrant(tokenData);

          // Update tokens in session (in case they were refreshed by createGrant)
          request.session['keycloak-token'] = grantObj.__raw || JSON.stringify(grantObj);
          request.session['keycloak-refresh-token'] = JSON.stringify(grantObj.refresh_token);
        } catch (e) {
          // If refresh failed or token is invalid, we clear session and throw Unauthorized
          if (e.message?.includes('expired') || e.message?.includes('refresh')) {
            console.warn('Keycloak session expired or refresh failed:', e.message);
          } else {
            console.error('Error reconstructing Keycloak grant from session:', e);
          }
          delete request.session['keycloak-token'];
          delete request.session['keycloak-refresh-token'];
          throw new Unauthorized('Session expired, please login again');
        }

        (request as any).kauth = { grant: grantObj };
        this.keycloakService.setToken(grantObj.access_token);
      } catch (e) {
        if (e instanceof Unauthorized) {
          throw e;
        }
        console.error('Unexpected error in AuthMiddleware:', e);
        if (request.session) {
          delete request.session['keycloak-token'];
          delete request.session['keycloak-refresh-token'];
        }
        throw new Unauthorized('Invalid session');
      }
    }

    // 3. Enforce protection and check for expiration/roles
    // keycloak.protect() returns a middleware function that handles:
    // - Token validation (including expiration)
    // - Redirecting to login if not authenticated (for browser requests)
    // - Checking roles if provided
    // return keycloak.enforcer(options.role, {response_mode: 'token'});
    // return keycloak.protect(options.role);
    const protectMiddleware = keycloak.protect(options.role);
    return new Promise((resolve, reject) => {
      // @ts-ignore
      protectMiddleware(request, ctx.getResponse(), (err: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(undefined);
        }
      });
    });
  }
}
