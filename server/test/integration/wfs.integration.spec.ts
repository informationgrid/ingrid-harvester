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

import type { WfsSettings } from '../../app/importer/wfs/wfs.settings.js';
import * as MiscUtils from '../../app/utils/misc.utils.js';
import wfsZdmKuestendaten from '../data/wfs/zdm-kuestendaten/config.json' with { type: 'json' };
import wfsZdmNok from '../data/wfs/zdm-nok/config.json' with { type: 'json' };
import wfsZdmNsk from '../data/wfs/zdm-nsk/config.json' with { type: 'json' };
import wfsZdmOsk from '../data/wfs/zdm-osk/config.json' with { type: 'json' };
import wfsZdmTideelbe from '../data/wfs/zdm-tideelbe/config.json' with { type: 'json' };
import wfsZdmTideems from '../data/wfs/zdm-tideems/config.json' with { type: 'json' };
import wfsZdmTideweser from '../data/wfs/zdm-tideweser/config.json' with { type: 'json' };
import { type ImporterIntegrationTestCase, runImporterIntegrationTest, setupIntegrationTestLifecycle } from '../utils/integration-test-runner.js';

describe('WFS Integration Tests', function () {
    this.timeout(60000);

    setupIntegrationTestLifecycle();

    const wfsTestcase = {
        profile: 'ingrid',
        expectedDocsDir: 'elasticsearch'
    } satisfies Partial<ImporterIntegrationTestCase<any>>;

    it('ZDM kuestendaten', async () => {
        await runImporterIntegrationTest({
            ...wfsTestcase,
            settings: wfsZdmKuestendaten as WfsSettings,
            baseFixture: 'test/data/wfs/zdm-kuestendaten',
            mocks: createWfsMocks(wfsZdmKuestendaten)
        });
    });

    it('ZDM nok', async () => {
        await runImporterIntegrationTest({
            ...wfsTestcase,
            settings: wfsZdmNok as WfsSettings,
            baseFixture: 'test/data/wfs/zdm-nok',
            mocks: createWfsMocks(wfsZdmNok)
        });
    });

    it('ZDM nsk', async () => {
        await runImporterIntegrationTest({
            ...wfsTestcase,
            settings: wfsZdmNsk as WfsSettings,
            baseFixture: 'test/data/wfs/zdm-nsk',
            mocks: createWfsMocks(wfsZdmNsk)
        });
    });

    it('ZDM osk', async () => {
        await runImporterIntegrationTest({
            ...wfsTestcase,
            settings: wfsZdmOsk as WfsSettings,
            baseFixture: 'test/data/wfs/zdm-osk',
            mocks: createWfsMocks(wfsZdmOsk)
        });
    });

    it('ZDM tideelbe', async () => {
        await runImporterIntegrationTest({
            ...wfsTestcase,
            settings: wfsZdmTideelbe as WfsSettings,
            baseFixture: 'test/data/wfs/zdm-tideelbe',
            mocks: createWfsMocks(wfsZdmTideelbe)
        });
    });

    it('ZDM tideems', async () => {
        await runImporterIntegrationTest({
            ...wfsTestcase,
            settings: wfsZdmTideems as WfsSettings,
            baseFixture: 'test/data/wfs/zdm-tideems',
            mocks: createWfsMocks(wfsZdmTideems)
        });
    });

    it('ZDM tideweser', async () => {
        await runImporterIntegrationTest({
            ...wfsTestcase,
            settings: wfsZdmTideweser as WfsSettings,
            baseFixture: 'test/data/wfs/zdm-tideweser',
            mocks: createWfsMocks(wfsZdmTideweser)
        });
    });
});

function createWfsMocks(settings: { typename: string }): any[] {
    const mocks = [];
    mocks.push({
        match: { query: { request: 'GetCapabilities' }},
        fixture: 'input/GetCapabilities.xml'
    });
    const typenames = settings.typename.split(',');
    for (const qualifiedTypename of typenames) {
        const typename = MiscUtils.substringAfterLast(qualifiedTypename, ':');
        mocks.push({
            match: { query: { request: 'DescribeFeatureType', typename: qualifiedTypename }},
            fixture: `input/${typename}/DescribeFeatureType.xml`
        });
        mocks.push({
            match: { query: { request: 'GetFeature', typename: qualifiedTypename, resultType: 'hits' }},
            fixture: `input/${typename}/GetFeature_hits.xml`
        });
        mocks.push({
            match: { query: { request: 'GetFeature', typename: qualifiedTypename, resultType: 'results' }},
            fixture: `input/${typename}/GetFeature.xml`
        });
    }
    return mocks;
}
