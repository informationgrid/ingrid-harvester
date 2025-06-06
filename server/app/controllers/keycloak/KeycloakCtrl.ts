/*
/!*
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
 *!/

import * as Express from 'express';
import { Controller, Get, Post, Req, Res, UseAuth } from '@tsed/common';
import {kAuthRequest, KeycloakService} from '../../services/keycloak/KeycloakService';
import { UsersService } from '../../services/users/UsersService';
import { Unauthorized } from '@tsed/exceptions';
import * as Passport from 'passport';



@Controller('/keycloak')
export class KeycloakCtrl {
    constructor(
        private keycloakService: KeycloakService,
        private usersService: UsersService
    ) {}

    /!**
     * Endpoint to check if a user is authenticated with Keycloak
     * @param request
     * @param response
     *!/
    @Get('/check')
    @UseAuth(KeycloakService, { role: 'user' })
    async check(@Req() request: kAuthRequest, @Res() response: Express.Response) {
        // If we get here, the user is authenticated with Keycloak
        // The user information is available in request.user
        if (request.user) {
            const username = request.user.username;

            // Check if user exists in our system
            const user = await this.usersService.findByEmail(username);

            if (user) {
                // Return user info without password
                const { password, ...userInfo } = user;
                return userInfo;
            }
        }

        throw new Unauthorized('User not authenticated or not found');
    }

    /!**
     * Endpoint to authenticate with Keycloak
     * @param request
     * @param response
     *!/
    @Post('/login')
    async login(@Req() request: Express.Request, @Res() response: Express.Response) {
        return new Promise<any>((resolve, reject) => {
            Passport.authenticate('keycloak', (err, user) => {
                if (err) {
                    return reject(err);
                }

                if (!user) {
                    return reject(new Unauthorized('Authentication failed'));
                }

                request.logIn(user, (err) => {
                    if (err) {
                        return reject(err);
                    }

                    resolve(user);
                });
            })(request, response, () => {});
        });
    }

    /!**
     * Endpoint to logout from Keycloak
     * @param request
     * @param response
     *!/
    @Get('/logout')
    async logout(@Req() request: Express.Request, @Res() response: Express.Response) {
        // Use the Keycloak logout URL
        const keycloak = this.keycloakService.getKeycloak();
        const logoutUrl = keycloak.logoutUrl("/");

        // Clear the session
        request.logout((err) => {
            if (err) {
                console.error('Error during logout:', err);
            }
        });

        return { logoutUrl };
    }
}
*/
