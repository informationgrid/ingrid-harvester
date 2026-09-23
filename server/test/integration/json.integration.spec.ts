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

import jsonClickrheinSettings from '../data/json/clickrhein/config.json' with { type: 'json' };
import { runImporterIntegrationTest, setupIntegrationTestLifecycle } from '../utils/integration-test-runner.js';
import type { JsonSettings } from '../../app/importer/json/json.settings.js';

describe('JSON Integration Tests', function () {
    this.timeout(60000);

    const profile = 'lvr';
    setupIntegrationTestLifecycle(profile);

    it('clickrhein-discoveries', async () => {
        await runImporterIntegrationTest({
            profile,
            expectedDocsDir: 'elasticsearch',
            mocks: [
                {
                    match: { url: 'https://www.kuladig.de/ClickRhein/api/discoveries?amount=999' },
                    fixture: 'input/discoveries.json'
                },
                {
                    match: { url: 'https://www.kuladig.de/ClickRhein/api/meta?tables=territory,suitabilities,themes,themes_spot,epochs' },
                    fixture: 'input/meta.json'
                }
            ],
            settings: jsonClickrheinSettings as JsonSettings,
            baseFixture: 'test/data/json/clickrhein'
        });
    });
});

