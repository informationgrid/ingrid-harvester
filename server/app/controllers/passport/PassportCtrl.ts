/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2022 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

import {BodyParams, Controller, Get, Post, Req, Required, Res} from "@tsed/common";
import * as Express from "express";
import * as Passport from "passport";
import {IUser} from "../../model/User";

@Controller("/passport")
export class PassportCtrl {
    /**
     * Authenticate user with local info (in Database).
     * @param username
     * @param password
     * @param request
     * @param response
     */
    @Post("/login")
    async login(@Required() @BodyParams("username") username: string,
                @Required() @BodyParams("password") password: string,
                @Req() request: Express.Request,
                @Res() response: Express.Response) {

        return new Promise<IUser>((resolve, reject) => {
            Passport
                .authenticate("login", (err, user: IUser) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    request.logIn(user, (err) => {

                        if (err) {
                            reject(err);
                        } else {
                            resolve(user);
                        }
                    });

                })(request, response, () => {
                });
        });

    }

    /**
     * Disconnect user
     * @param request
     */
    @Get("/logout")
    public logout(@Req() request: Express.Request): string {
        request.logout(null);
        return "Disconnected";
    }

}
