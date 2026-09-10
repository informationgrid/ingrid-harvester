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

import fs from 'fs';
import type { GenesisSettings } from '../../app/importer/genesis/genesis.settings.js';
import genesisStSettings from '../data/genesis/genesis-st/config.json' with { type: 'json' };
import { resolveFixturePath, runImporterIntegrationTest, setupIntegrationTestLifecycle } from '../utils/integration-test-runner.js';

describe('GENESIS Integration Tests', function () {
    this.timeout(60000);

    setupIntegrationTestLifecycle();

    it('genesis-st', async () => {
        const baseFixture = 'test/data/genesis/genesis-st';
        await runImporterIntegrationTest({
            profile: 'ingrid',
            expectedDocsDir: 'elasticsearch',
            mocks: createGenesisMocks(baseFixture, '11111', '11911', '12511'),
            settings: genesisStSettings as GenesisSettings,
            baseFixture
        });
    });
});

function createGenesisMocks(baseFixture: string, ...ids: string[]): any[] {
    const mocks = [];
    mocks.push({
        match: {
            url: 'https://genesis.sachsen-anhalt.de/webservice/rest/2020/catalogue/statistics',
            bodyParams: { start: '1' }
        },
        fixture: 'input/catalogue/statistics.json'
    });
    for (const id of ids) {
        mocks.push({
            match: {
                url: 'https://genesis.sachsen-anhalt.de/webservice/rest/2020/metadata/statistic',
                bodyParams: { name: id }
            },
            fixture: `input/metadata/statistic/${id}.json`
        });
        const tableDir = resolveFixturePath(baseFixture, 'input/metadata/table');
        for (const fn of fs.readdirSync(tableDir).filter(f => f.endsWith('.json'))) {
            mocks.push({
                match: {
                    url: 'https://genesis.sachsen-anhalt.de/webservice/rest/2020/metadata/table',
                    bodyParams: { name: fn.replace('.json', '') }
                },
                fixture: `input/metadata/table/${fn}`
            });
        }
        mocks.push({
            match: {
                url: 'https://genesis.sachsen-anhalt.de/webservice/rest/2020/catalogue/tables',
                bodyParams: { selection: `${id}*` }
            },
            fixture: `input/catalogue/tables/${id}.json`
        });
    }
    return mocks;
}
