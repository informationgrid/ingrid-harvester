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

import { Controller, Get, Next, Req, Res } from '@tsed/common';
import * as Express from 'express';
import passport from 'passport';
import type { AuthenticatedUser } from '../../services/auth/AuthenticatedUser.js';
import { hasAnyRole, logoutRequest } from '../../services/auth/AuthenticatedUser.js';
import { KeycloakService } from '../../services/keycloak/KeycloakService.js';

@Controller('/auth/keycloak')
export class KeycloakCtrl {

  constructor(private keycloakService: KeycloakService) {}

  private baseURL = process.env.BASE_URL ?? '/';

  private static readonly APPLICATION_ROLES = ['admin', 'editor', 'viewer'];

  /**
   * Redirect to Keycloak login page (authorization code flow with PKCE)
   */
  @Get('/login')
  login(@Req() request: Express.Request, @Res() response: Express.Response, @Next() next: Express.NextFunction) {
    passport.authenticate('keycloak')(request, response, next);
  }

  /**
   * Keycloak redirect target; completes the login and establishes the Passport session
   */
  @Get('/callback')
  callback(@Req() request: Express.Request, @Res() response: Express.Response) {
    return new Promise<void>((resolve) => {
      const redirectToLogin = (reason: 'keycloak' | 'no_permission' | 'session') => {
        const baseURL = this.baseURL.endsWith('/') ? this.baseURL : `${this.baseURL}/`;
        response.redirect(`${baseURL}login?error=${reason}`);
        resolve();
      };
      const done = (error?: any) => {
        if (error) {
          console.error('Unexpected Keycloak callback middleware error:', error);
          redirectToLogin('keycloak');
          return;
        }
        response.redirect(this.baseURL);
        resolve();
      };
      passport.authenticate('keycloak', (error: any, user: AuthenticatedUser | false) => {
        if (error) {
          if (request.query.error === 'access_denied') {
            console.warn('Keycloak login was denied or cancelled by the user');
            redirectToLogin('no_permission');
            return;
          }
          console.error('Keycloak callback failed:', error);
          redirectToLogin('keycloak');
          return;
        }
        if (!user) {
          console.warn('Keycloak callback did not return an authenticated user');
          redirectToLogin('keycloak');
          return;
        }
        if (!hasAnyRole(user, KeycloakCtrl.APPLICATION_ROLES)) {
          console.warn(`Keycloak user "${user.username}" has no application role`);
          redirectToLogin('no_permission');
          return;
        }
        // passport >= 0.6 regenerates the session in logIn (session fixation protection)
        request.logIn(user as Express.User, (loginError) => {
          if (loginError) {
            console.error('Error establishing Keycloak session:', loginError);
            redirectToLogin('session');
            return;
          }
          done();
        });
      })(request, response, done);
    });
  }

  /**
   * Endpoint to logout from Keycloak
   */
  @Get('/logout')
  async logout(@Req() request: Express.Request, @Res() response: Express.Response) {
    const user = request.user as AuthenticatedUser | undefined;
    const idToken = user?.keycloak?.idToken;
    const redirectUrl = await this.keycloakService.buildLogoutUrl(request, idToken);
    await this.keycloakService.logout(user);
    try {
      await logoutRequest(request, response);
    } catch (error) {
      console.warn('Failed to clear local session during Keycloak logout', error);
    }
    response.redirect(redirectUrl);
  }
}
