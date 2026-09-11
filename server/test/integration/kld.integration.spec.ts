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

import type { KldSettings } from '../../app/importer/kld/kld.settings.js';
import kldKuladigSettings from '../data/kld/kuladig/config.json' with { type: 'json' };
import { runImporterIntegrationTest, setupIntegrationTestLifecycle } from '../utils/integration-test-runner.js';

describe('KLD Integration Tests', function () {
    this.timeout(60000);

    const profile = 'lvr';
    setupIntegrationTestLifecycle(profile);

    it('kuladig', async () => {
        await runImporterIntegrationTest({
            profile,
            expectedDocsDir: 'elasticsearch',
            mocks: createKuladigMocks('SWB-268925', 'BKM-30800319', 'BKM-30400004'),
            settings: kldKuladigSettings as KldSettings,
            baseFixture: 'test/data/kld/kuladig'
        });
    });
});

function createKuladigMocks(...ids: string[]): any[] {
    const mocks = [];
    mocks.push({
        match: { url: 'https://www.kuladig.de/api/public/Objekt' },
        fixture: 'input/Objekt.json'
    });
    for (const id of ids) {
        mocks.push({
            match: { url: `https://www.kuladig.de/api/public/Objekt/${id}` },
            fixture: `input/${id}.json`
        });
    }
    return mocks;
}
