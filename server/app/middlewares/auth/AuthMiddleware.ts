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
      const token = JSON.parse(request.session['keycloak-token']);
      this.keycloakService.setToken(token);
    }

    // 2. Check if keycloak-connect already authenticated the request
    let grant = ctx.getRequest().kauth?.grant;
    if (grant) {
      this.keycloakService.setToken(grant.access_token);
      // Store tokens in session for BFF
      if (request.session) {
        request.session['keycloak-token'] = JSON.stringify(grant.access_token);
        request.session['keycloak-refresh-token'] = JSON.stringify(grant.refresh_token);
      }
    } else if (request.session && request.session['keycloak-token']) {
      try {
        let tokenStr = JSON.parse(request.session['keycloak-token']);
        // If it's just the JWT string, we need to wrap it
        const accessToken = typeof tokenStr === 'string' ? tokenStr : (tokenStr.token || tokenStr.access_token);

        // Use grantManager to create a grant from the token string
        // This ensures the token is a proper Keycloak Token object with hasRole methods
        const grantObj = await keycloak.grantManager.createGrant({
          access_token: accessToken,
          refresh_token: request.session['keycloak-refresh-token'] ? JSON.parse(request.session['keycloak-refresh-token']) : undefined
        });

        (request as any).kauth = { grant: grantObj };
        this.keycloakService.setToken(grantObj.access_token);
      } catch (e) {
        console.error('Error reconstructing Keycloak grant from session:', e);
        delete request.session['keycloak-token'];
        delete request.session['keycloak-refresh-token'];
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
