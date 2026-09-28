/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2026 wemove digital solutions GmbH
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

import type { DcatapSettings } from '../../app/importer/dcatap/dcatap.settings.js';
import dcatapDessauRosslauSettings from '../data/dcatap/dessau-rosslau/config.json' with { type: 'json' };
import dcatapOpendataHroSettings from '../data/dcatap/opendata-hro/config.json' with { type: 'json' };
import { runImporterIntegrationTest, setupIntegrationTestLifecycle } from '../utils/integration-test-runner.js';

describe('DCAT-AP Integration Tests', function () {
    this.timeout(60000);

    const profile = 'ingrid';
    setupIntegrationTestLifecycle(profile);

    it('opendata-hro (DCATAP with rdf-parse)', async () => {
        await runImporterIntegrationTest({
            profile,
            expectedDocsDir: 'elasticsearch',
            mocks: [{
                match: { url: 'https://www.opendata-hro.de/catalog.rdf' },
                fixture: 'input/catalog.rdf'
            }],
            settings: {
                ...dcatapOpendataHroSettings,
                type: 'DCATAP'
            } as DcatapSettings,
            baseFixture: 'test/data/dcatap/opendata-hro'
        });
    });

    it('dessau-rosslau (DCATAP with jsonld)', async () => {
        await runImporterIntegrationTest({
            profile,
            expectedDocsDir: 'elasticsearch',
            mocks: [{
                match: { url: 'https://open-data.stadtatlas.dessau-rosslau.de/api/feed/dcat-ap/3.0.0.json' },
                fixture: 'input/3.0.0.json'
            }],
            settings: {
                ...dcatapDessauRosslauSettings,
                type: 'DCATAP'
            } as DcatapSettings,
            baseFixture: 'test/data/dcatap/dessau-rosslau'
        });
    });
});
