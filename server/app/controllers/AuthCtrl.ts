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
import { Controller, Get, Req } from '@tsed/common';
import { KeycloakService } from '../services/keycloak/KeycloakService.js';
import { UsersService } from '../services/users/UsersService.js';
import { Unauthorized } from '@tsed/exceptions';

@Controller('/auth')
export class AuthCtrl {
    constructor(
        private keycloakService: KeycloakService,
        private usersService: UsersService
    ) {}

    /**
     * Unified endpoint to check if a user is authenticated (either Passport or Keycloak)
     * @param request
     */
    @Get('/check')
    async check(@Req() request: Express.Request) {
        // 1. Check Passport authentication
        if (request.isAuthenticated && request.isAuthenticated()) {
            const user: any = request.user;
            if (user) {
                const { password, ...userInfo } = user;
                return { 
                    ...userInfo, 
                    roles: user.roles || ['admin'], // Default to admin for passport users if roles not set
                    authMethod: 'local' 
                };
            }
        }

        // 2. Check Keycloak authentication
        if (request.session && request.session['keycloak-token']) {
            let token = JSON.parse(request.session['keycloak-token'])?.access_token;

            // If it's a string, it's probably the JWT itself and needs decoding
            if (typeof token === 'string') {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = Buffer.from(base64, 'base64').toString();
                token = JSON.parse(jsonPayload);
            }

            const content = token.content || token;
            const username = content.preferred_username || content.sub;
            const user = await this.usersService.findByEmail(username);
            const roles = this.keycloakService.getRoles(token);

            if (user) {
                const { password, ...userInfo } = user;
                return { 
                    ...userInfo, 
                    roles, 
                    authMethod: 'keycloak' 
                };
            }
            return { 
                username, 
                roles, 
                authMethod: 'keycloak' 
            };
        }

        throw new Unauthorized('User not authenticated');
    }
}
