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
import { Controller, Get, Req, Res } from '@tsed/common';
import { KeycloakService } from '../../services/keycloak/KeycloakService.js';
import { UsersService } from '../../services/users/UsersService.js';
import { Unauthorized } from '@tsed/exceptions';

@Controller('/auth/keycloak')
export class KeycloakCtrl {
    constructor(
        private keycloakService: KeycloakService,
        private usersService: UsersService
    ) {}

    /**
     * Endpoint to check if a user is authenticated with Keycloak
     * @param request
     */
    @Get('/check')
    async check(@Req() request: Express.Request) {
        // Allow Passport authenticated users
        if (request.isAuthenticated && request.isAuthenticated()) {
          return;
        }

        // handle keycloak authentication
        if (request.session && request.session['keycloak-token']) {
            let token = JSON.parse(request.session['keycloak-token'])?.access_token;

            // If it's a string, it's probably the JWT itself and needs decoding
            if (typeof token === 'string') {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = Buffer.from(base64, 'base64').toString();
                token = JSON.parse(jsonPayload);
            }

            // Minimal check: if we have a token in session, consider authenticated for now
            // In a real app, you'd validate the token here.
            const content = token.content || token;
            const username = content.preferred_username || content.sub;
            const user = await this.usersService.findByEmail(username);

            if (user) {
                const { password, ...userInfo } = user;
                return { ...userInfo, roles: this.keycloakService.getRoles(token) };
            }
            return { username, roles: this.keycloakService.getRoles(token) };
        }

        throw new Unauthorized('User not authenticated');
    }

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
            response.redirect('/');
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

        if (request.session) {
            delete request.session['keycloak-token'];
            delete request.session['keycloak-refresh-token'];
        }

        const logoutUrl = keycloak.logoutUrl("/");

        request.logout((err) => {
            if (err) {
                console.error('Error during logout:', err);
            }
        });

        response.redirect(logoutUrl);
    }
}

