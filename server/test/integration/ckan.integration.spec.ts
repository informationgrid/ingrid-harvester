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

import ckanGovdataUbaSettings from '../data/ckan/govdata-uba/config.json' with { type: 'json' };
import { runImporterIntegrationTest, setupIntegrationTestLifecycle } from '../utils/integration-test-runner.js';
import type { CkanSettings } from '../../app/importer/ckan/ckan.settings.js';

describe('CKAN Integration Tests', function () {
    this.timeout(60000);

    const profile = 'ingrid';
    setupIntegrationTestLifecycle(profile);

    it('govdata-uba', async () => {
        await runImporterIntegrationTest({
            profile,
            expectedDocsDir: 'elasticsearch',
            mocks: [
                {
                    match: { url: 'https://ckan.govdata.de/api/3/action/package_list' },
                    fixture: 'input/package_list.json'
                },
                {
                    match: { url: 'https://ckan.govdata.de/api/action/package_search' },
                    fixture: 'input/package_search.json'
                }
            ],
            settings: ckanGovdataUbaSettings as CkanSettings,
            baseFixture: 'test/data/ckan/govdata-uba'
        });
    });
});
