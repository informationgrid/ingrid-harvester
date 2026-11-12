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

import { Context, Middleware, Req, type MiddlewareMethods } from '@tsed/common';
import { Forbidden, Unauthorized } from '@tsed/exceptions';
import type { KeycloakAuthOptions } from '../../decorators/KeycloakAuthOptions.js';
import { hasAnyRole, type AuthenticatedUser } from '../../services/auth/AuthenticatedUser.js';
import { KeycloakService } from '../../services/keycloak/KeycloakService.js';

@Middleware()
export class AuthMiddleware implements MiddlewareMethods {

  constructor(protected keycloakService: KeycloakService) {
  }

  public async use(@Req() request: Express.Request, @Context() ctx: Context) {
    const user = request.user as AuthenticatedUser | undefined;
    if (!request.isAuthenticated?.() || !user) {
      throw new Unauthorized('Session expired, please login again');
    }

    await this.keycloakService.ensureFreshUser(request, ctx.getResponse());

    const options: KeycloakAuthOptions = ctx.endpoint.store.get(AuthMiddleware) || {};
    if (options.role) {
      const roles = Array.isArray(options.role) ? options.role : [options.role];
      if (!hasAnyRole(request.user as AuthenticatedUser, roles)) {
        throw new Forbidden('Insufficient role');
      }
    }
  }
}
