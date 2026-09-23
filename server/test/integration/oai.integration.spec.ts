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

import type { OaiSettings } from '../../app/importer/oai/oai.settings.js';
import oaiDigicultSpracheSettings from '../data/oai/digicult-sprache/config.json' with { type: 'json' };
import oaiRheinpublicaSettings from '../data/oai/rheinpublica/config.json' with { type: 'json' };
import { type ImporterIntegrationTestCase, runImporterIntegrationTest, setupIntegrationTestLifecycle } from '../utils/integration-test-runner.js';

describe('OAI PMH Integration Tests', function () {
    this.timeout(60000);

    const profile = 'lvr';
    setupIntegrationTestLifecycle(profile);

    const oaiTestcase = {
        profile,
        expectedDocsDir: 'elasticsearch',
        mocks: [
            {
                match: { query: { verb: 'ListRecords' }},
                fixture: 'input/ListRecords.xml'
            }
        ]
    } satisfies Partial<ImporterIntegrationTestCase<OaiSettings>>;

    it('rheinpublica (mods)', async () => {
        await runImporterIntegrationTest({
            ...oaiTestcase,
            settings: oaiRheinpublicaSettings as OaiSettings,
            baseFixture: 'test/data/oai/rheinpublica'
        });
    });

    it('digicult-sprache (lido)', async () => {
        await runImporterIntegrationTest({
            ...oaiTestcase,
            settings: oaiDigicultSpracheSettings as OaiSettings,
            baseFixture: 'test/data/oai/digicult-sprache'
        });
    });
});
