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

import { expect } from 'chai';
import { Summary } from '../../app/model/summary.js';
import { PostgresUtils } from '../../app/persistence/postgres.utils.js';
import { setupIntegrationTestLifecycle } from '../utils/integration-test-runner.js';
import { getTestDatabaseConfig, resetDatabase } from '../utils/postgres-container.js';

describe('Basic Integration Tests', function () {
    this.timeout(60000);

    setupIntegrationTestLifecycle();

    it('should maintain test isolation via database table reset', async () => {
        await resetDatabase();
        const postgresUtils = new PostgresUtils(getTestDatabaseConfig(), new Summary('test-isolation', {} as any));
        const identifiers = await postgresUtils.getDatasetIdentifiers('test-source');
        expect(identifiers).to.be.an('array').that.is.empty;
    });
});
