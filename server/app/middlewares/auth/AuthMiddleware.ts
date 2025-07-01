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


import {Context, Inject, Middleware, MiddlewareMethods, Req} from "@tsed/common";
import {KeycloakService} from "../../services/keycloak/KeycloakService";
import {Unauthorized} from "@tsed/exceptions";

@Middleware()
export class AuthMiddleware implements MiddlewareMethods {
    @Inject()
    protected keycloakService: KeycloakService;

    public use(@Req() request: Express.Request, @Context() ctx: Context) {
        let grant = ctx.getRequest().kauth.grant;
        if (grant) {
            this.keycloakService.setToken(grant.access_token);
            // return
            return this.keycloakService.getKeycloakInstance().protect();
        } else {
            //retrieve Options passed to the Authenticated() decorators.
            const options = ctx.endpoint.store.get(AuthMiddleware) || {};
            //$log.debug("AuthMiddleware =>", options);
            //$log.debug("AuthMiddleware isAuthenticated ? =>", request.isAuthenticated());

            if (!request.isAuthenticated()) {
                throw new Unauthorized("Unauthorized");
            }
        }
    }
}
