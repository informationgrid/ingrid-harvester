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

import { Controller, Get, Req } from '@tsed/common';
import { Unauthorized } from '@tsed/exceptions';
import * as Express from 'express';
import type { AuthenticatedUser } from '../services/auth/AuthenticatedUser.js';
import { toPublicUser } from '../services/auth/AuthenticatedUser.js';

@Controller('/auth')
export class AuthCtrl {

    /**
     * Unified endpoint to check if a user is authenticated (either Passport or Keycloak)
     * @param request
     */
    @Get('/check')
    async check(@Req() request: Express.Request) {
        if (request.isAuthenticated?.() && request.user) {
            return toPublicUser(request.user as AuthenticatedUser);
        }
        throw new Unauthorized('User not authenticated');
    }
}
