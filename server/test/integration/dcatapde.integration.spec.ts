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

import dcatapdeOpendataHroSettings from '../data/dcatapde/opendata-hro/config.json' with { type: 'json' };
import { runImporterIntegrationTest, setupIntegrationTestLifecycle } from '../utils/integration-test-runner.js';
import type { DcatapdeSettings } from '../../app/importer/dcatapde/dcatapde.settings.js';

describe('DCAT-AP.de Integration Tests', function () {
    this.timeout(60000);

    setupIntegrationTestLifecycle();

    it('opendata-hro', async () => {
        await runImporterIntegrationTest({
            profile: 'ingrid',
            expectedDocsDir: 'elasticsearch',
            mocks: [{
                match: { url: 'https://www.opendata-hro.de/catalog.rdf' },
                fixture: 'input/catalog.rdf'
            }],
            settings: dcatapdeOpendataHroSettings as DcatapdeSettings,
            baseFixture: 'test/data/dcatapde/opendata-hro'
        });
    });
});
