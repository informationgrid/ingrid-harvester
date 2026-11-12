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

import { Forbidden, Unauthorized } from '@tsed/exceptions';
import assert from 'node:assert/strict';
import { AuthMiddleware } from '../../app/middlewares/auth/AuthMiddleware.js';
import type { AuthenticatedUser } from '../../app/services/auth/AuthenticatedUser.js';

describe('AuthMiddleware', () => {
    const middleware = new AuthMiddleware({ensureFreshUser: async () => {}} as any);

    for (const authMethod of ['local', 'keycloak'] as const) {
        it(`accepts authenticated ${authMethod} users with a required role`, async () => {
            await middleware.use(request({username: 'alice', roles: ['editor'], authMethod}), context(['admin', 'editor']));
        });

        it(`rejects authenticated ${authMethod} users without a required role`, async () => {
            await assert.rejects(
                middleware.use(request({username: 'alice', roles: [], authMethod}), context(['admin', 'editor'])),
                Forbidden
            );
        });
    }

    it('rejects authenticated users whose normalized user has no roles', async () => {
        await assert.rejects(
            middleware.use(request({username: 'alice', roles: undefined as any, authMethod: 'keycloak'}), context(['admin'])),
            Forbidden
        );
    });

    it('rejects unauthenticated requests', async () => {
        const unauthenticated = {
            isAuthenticated: () => false,
            user: undefined
        } as any;
        await assert.rejects(middleware.use(unauthenticated, context(['admin'])), Unauthorized);
    });
});

function context(roles: string[]) {
    return {
        endpoint: {store: new Map([[AuthMiddleware, {role: roles}]])},
        getResponse: () => ({})
    } as any;
}

function request(user: AuthenticatedUser | undefined) {
    return {
        isAuthenticated: () => true,
        user
    } as any;
}
