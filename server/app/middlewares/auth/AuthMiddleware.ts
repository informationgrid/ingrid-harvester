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

  public use(@Req() request: Express.Request, @Context() ctx: Context) {
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
    }

    // 3. Enforce protection and check for expiration/roles
    // keycloak.protect() returns a middleware function that handles:
    // - Token validation (including expiration)
    // - Redirecting to login if not authenticated (for browser requests)
    // - Checking roles if provided
    return keycloak.enforcer(options.role, {response_mode: 'token'});
  }
}
