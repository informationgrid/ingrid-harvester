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

import * as Express from 'express';
import {Controller, Get, Req, Res} from '@tsed/common';
import {KeycloakService} from '../../services/keycloak/KeycloakService.js';
import fetch from 'node-fetch';
import {Inject} from "@tsed/di";

@Controller('/auth/keycloak')
export class KeycloakCtrl {

  @Inject()
  private keycloakService: KeycloakService;

  private baseURL = process.env.BASE_URL ?? '/';

  /**
   * Redirect to Keycloak login page
   */
  @Get('/login')
  async login(@Req() request: Express.Request, @Res() response: Express.Response) {
    const keycloak = this.keycloakService.getKeycloakInstance();
    // Use keycloak.protect() to trigger the login flow.
    // This will handle the redirect to Keycloak and the callback automatically.
    const protect = keycloak.protect();
    protect(request, response, () => {
      // If we reach here, the user is already authenticated.
      // This might happen if they call /login while already logged in.
      response.redirect(this.baseURL);
    });
  }

  /**
   * Endpoint to logout from Keycloak
   * @param request
   * @param response
   */
  @Get('/logout')
  async logout(@Req() request: Express.Request, @Res() response: Express.Response) {
    const keycloak = this.keycloakService.getKeycloakInstance();
    const refreshToken = this.getRefreshToken(request);

    if (request.session) {
      delete request.session['keycloak-token'];
      delete request.session['keycloak-refresh-token'];
    }

    // Perform back-channel logout to Keycloak if we have a refresh token
    if (refreshToken) {
      try {
        const config = (keycloak as any).config;
        const authServerUrl = config.authServerUrl;
        const realm = config.realm;
        const realmUrl = `${authServerUrl}/realms/${realm}`;
        const clientId = config.clientId;
        const secret = config.secret;

        const params = new URLSearchParams();
        params.append('client_id', clientId);
        params.append('client_secret', secret);
        params.append('refresh_token', refreshToken);

        await fetch(`${realmUrl}/protocol/openid-connect/logout`, {
          method: 'POST',
          body: params,
          headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        });
      } catch (e) {
        console.error('Error during Keycloak back-channel logout:', e);
      }
    }

    return new Promise<void>((resolve) => {
      request.logout((err) => {
        if (err) {
          console.error('Error during local logout:', err);
        }
        response.status(200).send({success: true});
        resolve();
      });
    });
  }

  /**
   * Extracts the refresh token from the request session or grant.
   * @param request
   * @private
   */
  private getRefreshToken(request: Express.Request): string | undefined {
    let refreshToken = request.session?.['keycloak-refresh-token'];

    // Try to parse 'keycloak-refresh-token' from session
    if (refreshToken) {
      if (typeof refreshToken === 'string' && refreshToken.startsWith('{')) {
        try {
          refreshToken = JSON.parse(refreshToken).token;
        } catch (e) {
          console.error('Error parsing refreshToken from session:', e);
        }
      } else if (typeof refreshToken === 'object' && refreshToken.token) {
        refreshToken = refreshToken.token;
      }
    }

    // If not in session, try to get it from the grant (if available)
    if (!refreshToken && (request as any).kauth?.grant) {
      refreshToken = (request as any).kauth.grant.refresh_token?.token;
    }

    // If still not found, try to parse from keycloak-token
    if (!refreshToken && request.session?.['keycloak-token']) {
      try {
        let grantData = request.session['keycloak-token'];
        if (typeof grantData === 'string' && grantData.startsWith('{')) {
          grantData = JSON.parse(grantData);
        }
        refreshToken = grantData.refresh_token?.token || grantData.refresh_token;
      } catch (e) {
        // Ignore parsing errors here
      }
    }

    return typeof refreshToken === 'string' ? refreshToken : undefined;
  }
}

