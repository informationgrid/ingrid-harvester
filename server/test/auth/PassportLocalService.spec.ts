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

import assert from 'node:assert/strict';
import { PassportLocalService } from '../../app/services/passport/PassportLocalService.js';

describe('PassportLocalService', () => {
    it('authenticates a local user into the normalized Passport shape', async () => {
        const source = {
            username: 'admin',
            firstName: 'Ada',
            lastName: 'Lovelace',
            password: 'stored-hash',
            roles: []
        };
        const service = new PassportLocalService(
            {findByCredential: async () => source} as any,
            {get: () => ({})} as any,
            {use: () => {}} as any
        );

        const user = await service.login('admin', 'password');

        assert.deepEqual(user, {
            username: 'admin',
            name: 'Ada Lovelace',
            roles: ['admin'],
            authMethod: 'local'
        });
        assert.equal(source.password, 'stored-hash');
        assert.equal('password' in user, false);
    });

    it('serializes the normalized user without mutating it', () => {
        const user = {username: 'alice', roles: ['editor'], authMethod: 'local' as const};
        PassportLocalService.serialize(user, (error, sessionUser) => {
            assert.equal(error, null);
            assert.equal(sessionUser, user);
            assert.deepEqual(user, {username: 'alice', roles: ['editor'], authMethod: 'local'});
        });
    });
});
