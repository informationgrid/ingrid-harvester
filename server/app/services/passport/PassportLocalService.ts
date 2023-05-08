/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
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

import {AfterRoutesInit, BeforeRoutesInit, ExpressApplication, Inject, ServerSettingsService, Service} from "@tsed/common";
import * as Passport from "passport";
import {Strategy} from "passport-local";
import {NotFound} from "ts-httpexceptions";
import {UsersService} from "../users/UsersService";
import {IUser} from "../../model/User";

@Service()
export class PassportLocalService implements BeforeRoutesInit, AfterRoutesInit {

    constructor(private usersService: UsersService,
                private serverSettings: ServerSettingsService,
                @Inject(ExpressApplication) private  expressApplication: ExpressApplication) {

        // used to serialize the user for the session
        Passport.serializeUser(PassportLocalService.serialize);

        // used to deserialize the user
        Passport.deserializeUser(this.deserialize.bind(this));
    }

    $beforeRoutesInit() {
        const options: any = this.serverSettings.get("passport") || {} as any;
        const {userProperty, pauseStream} = options;

        this.expressApplication.use(Passport.initialize({userProperty}));
        this.expressApplication.use(Passport.session({pauseStream}));
    }

    $afterRoutesInit() {
        this.initializeLogin();
    }

    /**
     *
     * @param user
     * @param done
     */
    static serialize(user: IUser, done) {
        delete user.password;
        done(null, user.username);
    }

    /**
     *
     * @param id
     * @param done
     */
    public deserialize(id, done) {
        done(null, this.usersService.find(id));
    };


    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    public initializeLogin() {
        Passport.use("login", new Strategy({
            passReqToCallback: true // allows us to pass back the entire request to the callback
        }, (req, username, password, done) => {
            this.login(username, password)
                .then((user) => done(null, user))
                .catch((err) => done(err));
        }));
    }

    /**
     *
     * @param username
     * @param password
     * @returns {Promise<boolean>}
     */
    async login(username: string, password: string): Promise<IUser> {
        const user = await this.usersService.findByCredential(username, password);
        if (user) {
            return user;
        }

        throw new NotFound("User not found");
    };
}
