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

import { BodyParams, Controller, Get, Post, Req, Res } from '@tsed/common';
import { Required } from '@tsed/schema';
import * as Express from 'express';
import passport from 'passport';
import type { AuthenticatedUser } from '../../services/auth/AuthenticatedUser.js';
import { logoutRequest, toPublicUser } from '../../services/auth/AuthenticatedUser.js';

@Controller('/passport')
export class PassportCtrl {
    /**
     * Authenticate user with local info (in Database).
     * @param username
     * @param password
     * @param request
     * @param response
     */
    @Post('/login')
    async login(@Required() @BodyParams('username',) username: string,
                @Required() @BodyParams('password') password: string,
                @Req() request: Express.Request,
                @Res() response: Express.Response) {

        return new Promise<ReturnType<typeof toPublicUser>>((resolve, reject) => {
            passport
                .authenticate('login', (err, user: AuthenticatedUser) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    if (!user) {
                        reject(new Error('Invalid username or password'));
                        return;
                    }

                    request.logIn(user as Express.User, (err) => {

                        if (err) {
                            reject(err);
                        } else {
                            resolve(toPublicUser(user));
                        }
                    });

                })(request, response, () => {
                });
        });

    }

    /**
     * Disconnect user
     * @param request
     * @param response
     */
    @Get('/logout')
    public async logout(@Req() request: Express.Request, @Res() response: Express.Response): Promise<string> {
        await logoutRequest(request, response);
        return 'Disconnected';
    }

}
