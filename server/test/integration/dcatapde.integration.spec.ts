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
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dcatapdeOpendataHroSettings from '../data/dcatapde/opendata-hro/config.json' with { type: 'json' };
import { runImporterIntegrationTest, setupIntegrationTestLifecycle } from '../utils/integration-test-runner.js';
import { getTestDatabaseConfig } from '../utils/postgres-container.js';
import type { DcatapdeSettings } from '../../app/importer/dcatapde/dcatapde.settings.js';

describe('DCAT-AP.de Integration Tests', function () {
    this.timeout(60000);

    const profile = 'ingrid';
    setupIntegrationTestLifecycle(profile);

    it('opendata-hro', async () => {
        await runImporterIntegrationTest({
            profile,
            expectedDocsDir: 'elasticsearch',
            mocks: [{
                match: { url: 'https://www.opendata-hro.de/catalog.rdf' },
                fixture: 'input/catalog.rdf'
            }],
            settings: dcatapdeOpendataHroSettings as DcatapdeSettings,
            baseFixture: 'test/data/dcatapde/opendata-hro'
        });

        // stored record: original_document is the dereferenced dcat:Dataset; no DCAT-AP.de and no CSW document
        const client = new pg.Client(getTestDatabaseConfig());
        await client.connect();
        try {
            const result = await client.query('SELECT identifier, original_document, dataset_dcatapde, dataset_csw FROM public.record WHERE source = $1', [dcatapdeOpendataHroSettings.sourceURL]);
            expect(result.rows).to.have.lengthOf(3);
            for (const row of result.rows) {
                const expected = fs.readFileSync(path.join('test/data/dcatapde/opendata-hro/original', `${row.identifier}.xml`), 'utf8');
                // line endings may be converted by git
                expect(row.original_document.replace(/\r\n/g, '\n'), row.identifier).to.equal(expected.replace(/\r\n/g, '\n'));
                expect(row.dataset_dcatapde, row.identifier).to.be.null;
                expect(row.dataset_csw, row.identifier).to.be.null;
            }
        }
        finally {
            await client.end();
        }
    });
});
