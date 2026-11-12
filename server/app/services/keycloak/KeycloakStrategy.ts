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

import type { Request } from 'express';
import { Strategy } from 'passport-strategy';
import type { KeycloakService } from './KeycloakService.js';

export class KeycloakStrategy extends Strategy {
    public name = 'keycloak';

    constructor(private readonly keycloakService: KeycloakService) {
        super();
    }

    authenticate(request: Request): void {
        const path = request.path || new URL(request.originalUrl, 'http://localhost').pathname;
        if (path.endsWith('/callback')) {
            this.keycloakService.completeLogin(request)
                .then(user => this.success(user))
                .catch(error => this.error(error));
            return;
        }

        this.keycloakService.createAuthorizationUrl(request)
            .then(url => this.redirect(url.href))
            .catch(error => this.error(error));
    }
}
