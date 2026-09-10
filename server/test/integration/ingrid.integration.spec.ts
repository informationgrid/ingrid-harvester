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
import type { CswSettings } from '../../app/importer/csw/csw.settings.js';
import type { WfsSettings } from '../../app/importer/wfs/wfs.settings.js';
import { Summary } from '../../app/model/summary.js';
import { PostgresUtils } from '../../app/persistence/postgres.utils.js';
import cswEbaConfig from '../data/csw/eba/config.json' with { type: 'json' };
import cswGdideConfig from '../data/csw/gdide/config.json' with { type: 'json' };
import wfsZdmKuestendaten from '../data/wfs/zdm-kuestendaten/config.json' with { type: 'json' };
import { runImporterIntegrationTest, setupIntegrationTestLifecycle } from '../utils/integration-test-runner.js';
import { getTestDatabaseConfig, resetDatabase } from '../utils/postgres-container.js';
import { cswTestcase, wfsTestcase } from './base.testcases.js';

describe('Ingrid Integration Tests', function () {
    this.timeout(60000);

    setupIntegrationTestLifecycle();

    it('should harvest records from CSW and push them to ES (GDI-DE)', async () => {
        await runImporterIntegrationTest({
            ...cswTestcase,
            settings: cswGdideConfig as CswSettings,
            baseFixture: 'test/data/csw/gdide'
        });
    });

    it('should harvest records from CSW and push them to ES (EBA)', async () => {
        await runImporterIntegrationTest({
            ...cswTestcase,
            settings: cswEbaConfig as CswSettings,
            baseFixture: 'test/data/csw/eba'
        });
    });

    it('should harvest records from WFS and push them to ES (ZDM Kuestendaten)', async () => {
        await runImporterIntegrationTest({
            ...wfsTestcase,
            settings: wfsZdmKuestendaten as WfsSettings,
            baseFixture: 'test/data/wfs/zdm-kuestendaten',
            mocks: [
                ...wfsTestcase.mocks,
                {
                    match: { query: { request: 'GetFeature', typename: 'ms:DeichverbandZustaendigkeitBeschriftung', resultType: 'hits' }},
                    fixture: 'input/DeichverbandZustaendigkeitBeschriftung/GetFeature_hits.xml'
                },
                {
                    match: { query: { request: 'DescribeFeatureType', typename: 'ms:DeichverbandZustaendigkeitBeschriftung' }},
                    fixture: 'input/DeichverbandZustaendigkeitBeschriftung/DescribeFeatureType.xml'
                },
                {
                    match: { query: { request: 'GetFeature', typename: 'ms:DeichverbandZustaendigkeitBeschriftung', resultType: 'results' }},
                    fixture: 'input/DeichverbandZustaendigkeitBeschriftung/GetFeature.xml'
                },
                {
                    match: { query: { request: 'GetFeature', typename: 'ms:ElbeFrKilometrierung', resultType: 'hits' }},
                    fixture: 'input/ElbeFrKilometrierung/GetFeature_hits.xml'
                },
                {
                    match: { query: { request: 'DescribeFeatureType', typename: 'ms:ElbeFrKilometrierung' }},
                    fixture: 'input/ElbeFrKilometrierung/DescribeFeatureType.xml'
                }
            ]
        });
    });

    it('should maintain test isolation via database table reset', async () => {
        await resetDatabase();
        const postgresUtils = new PostgresUtils(getTestDatabaseConfig(), new Summary('test-isolation', {} as any));
        const identifiers = await postgresUtils.getDatasetIdentifiers('test-source');
        expect(identifiers).to.be.an('array').that.is.empty;
    });
});
