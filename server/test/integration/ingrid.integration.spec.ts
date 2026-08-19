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

import type { ElasticsearchCatalogSettings } from "@shared/catalog.js";
import * as chai from 'chai';
import { expect } from 'chai';
import chaiExclude from 'chai-exclude';
import deepEqualInAnyOrder from 'deep-equal-in-any-order';
import fs from 'fs';
import sinon from 'sinon';
import type { CswSettings } from '../../app/importer/csw/csw.settings.js';
import { Summary } from '../../app/model/summary.js';
import { ElasticsearchFactory } from '../../app/persistence/elastic.factory.js';
import { PostgresUtils } from '../../app/persistence/postgres.utils.js';
import { ProfileFactoryLoader } from '../../app/profiles/profile.factory.loader.js';
import { CatalogService } from '../../app/services/catalog/CatalogService.js';
import { ConfigService } from '../../app/services/config/ConfigService.js';
import { RequestDelegate } from '../../app/utils/http-request.utils.js';
import { setupElasticMock } from '../mocks/elastic.mock.js';
import { getTestDatabaseConfig, resetDatabase, startPostgresContainer, stopPostgresContainer } from '../utils/postgres-container.js';
import { compareEsDocuments } from '../utils/test-utils.js';

chai.use(chaiExclude);
chai.use(deepEqualInAnyOrder);

describe('Ingrid Integration Test (CSW-to-ES)', function () {
    this.timeout(60000);

    let elasticMock: any;
    let requestStub: sinon.SinonStub;
    let postgresUtils: PostgresUtils;

    before(async function () {
        this.timeout(60000);
        process.env.IMPORTER_PROFILE = 'ingrid';

        // start postgres and init schema
        const dbConfig = await startPostgresContainer();
        postgresUtils = new PostgresUtils(dbConfig, new Summary('test-init', {} as any));
        await postgresUtils.init();
    });

    after(async function () {
        this.timeout(30000);
        await stopPostgresContainer();
    });

    beforeEach(async () => {
        await resetDatabase();

        // mock generalSettings
        sinon.stub(ConfigService, 'getGeneralSettings').returns({
            database: getTestDatabaseConfig(),
            elasticsearch: { prefix: 'test-', index: 'harvester' },
            harvesting: { mail: { enabled: false }, cancel: { enabled: false } },
            mail: { enabled: false }
        } as any);

        // mock catalogSettings for 'ingrid'
        sinon.stub(CatalogService, 'getCatalogSettings').withArgs(1).returns({
            id: 1,
            name: 'ingrid',
            type: 'elasticsearch',
            url: 'http://localhost:9200',
            settings: {
                index: 'harvester'
            }
        } as ElasticsearchCatalogSettings);

        // mock elasticUtils
        elasticMock = setupElasticMock();
        sinon.stub(ElasticsearchFactory, 'getElasticUtils').returns(elasticMock);

        // mock HTTP requests
        requestStub = sinon.stub(RequestDelegate, 'doRequest');
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should harvest records from CSW and push them to ES', async () => {
        // retrieve mock responses
        const capabilitiesXml = fs.readFileSync('test/data/csw/input/GetCapabilities.xml', 'utf8');
        const hitsXml = fs.readFileSync('test/data/csw/input/GetRecordsHits.xml', 'utf8');
        const resultsXml = fs.readFileSync('test/data/csw/input/GetRecordsResults.xml', 'utf8');

        // configure request stub with curated responses
        requestStub.callsFake((config) => {
            if (config.qs?.request === 'GetCapabilities') {
                return capabilitiesXml;
            }
            if (config.qs?.resultType === 'hits') {
                return hitsXml;
            }
            if (config.qs?.resultType === 'results') {
                return resultsXml;
            }
            throw new Error("This request is not mocked.");
        });

        const settings: CswSettings = {
            id: 1,
            dataSourceName: 'Harvester',
            type: 'CSW',
            sourceURL: 'https://gdk.gdi-de.org/gdi-de/srv/eng/csw',
            catalogIds: [1],
            iPlugId: 'geoportal',
            partner: 'bund',
            provider: 'bu_bkg',
            datatype: 'default,dsc_csw,csw,metadata,IDF_1.0',
            eitherKeywords: [],
            harvestingMode: undefined,
            httpMethod: 'GET',
            maxConcurrent: 1,
            maxServices: 1,
            resolveOgcDistributions: false,
            simplifyTolerance: 0,
            timeout: 0,
        };
        const importer = await ProfileFactoryLoader.get().getImporter(settings);

        // run importer (CSW harvesting -> DB upsert -> ES index)
        await new Promise<void>((resolve, reject) => {
            importer.run().subscribe({
                complete: resolve,
                error: reject
            });
        });

        // verify that the ingrid ES catalog correctly processes the records read from the database
        expect(elasticMock.addOperationChunksToBulk.called, 'ElasticsearchUtils.addOperationChunksToBulk should be called').to.be.true;
        const allOperations = elasticMock.addOperationChunksToBulk.args.flatMap((args: any[]) => args[0]);
        const indexOps = allOperations.filter((op: any) => op.operation === 'index');

        const numDocuments = parseInt(resultsXml.match(/numberOfRecordsReturned="(\d+)"/)?.[1], 10) ?? 0;
        expect(indexOps, 'Should contain index operations for harvested documents').to.have.lengthOf(numDocuments);

        // verify that the actual ES documents match the expected ones
        const documents = indexOps.map((op: any) => op.document);
        for (const actual of documents) {
            const expected = (await import(`../data/csw/elasticsearch/${actual.uuid}.json`, { with: { type: 'json' }})).default;
            compareEsDocuments(actual, expected);
        }
    });

    it('should maintain test isolation via database table reset', async () => {
        // verify database is completely empty at the start of the test due to beforeEach resetDatabase()
        const identifiers = await postgresUtils.getDatasetIdentifiers('test-source');
        expect(identifiers).to.be.an('array').that.is.empty;
    });
});
