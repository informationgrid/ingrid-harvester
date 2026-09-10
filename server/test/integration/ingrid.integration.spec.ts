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
import sinon from 'sinon';
import fs from 'fs';
import { DatabaseFactory } from '../../app/persistence/database.factory.js';
import { ElasticsearchFactory } from '../../app/persistence/elastic.factory.js';
import { RequestDelegate } from '../../app/utils/http-request.utils.js';
import { setupPgMock } from '../mocks/pg.mock.js';
import { setupElasticMock } from '../mocks/elastic.mock.js';
import { CswImporter } from '../../app/importer/csw/csw.importer.js';
import { Summary } from '../../app/model/summary.js';
import { PostgresUtils } from '../../app/persistence/postgres.utils.js';
import { ConfigService } from '../../app/services/config/ConfigService.js';
import { CatalogService } from '../../app/services/catalog/CatalogService.js';
import type { ElasticsearchCatalogSettings } from "@shared/catalog.js";

describe('Ingrid Integration Test (CSW-to-ES)', () => {
    let pgDb;
    let elasticMock;
    let requestStub;
    let postgresUtils;

    before(async () => {
        // Force the 'ingrid' profile for the test
        process.env.IMPORTER_PROFILE = 'ingrid';
    });

    beforeEach(async () => {
        // Mock General Settings
        sinon.stub(ConfigService, 'getGeneralSettings').returns({
            database: { type: 'postgresql' },
            elasticsearch: { prefix: 'test-', index: 'harvester' },
            harvesting: { mail: { enabled: false }, cancel: { enabled: false } },
            mail: { enabled: false }
        } as any);

        // Mock Catalog Settings for 'ingrid'
        sinon.stub(CatalogService, 'getCatalogSettings').withArgs(1).returns({
            id: 1,
            name: 'ingrid',
            type: 'elasticsearch',
            url: 'http://localhost:9200',
            settings: {
                index: 'harvester'
            }
        } as ElasticsearchCatalogSettings);

        // Setup Database and ES Mocks
        const mockResult = await setupPgMock();
        pgDb = mockResult.db;
        elasticMock = setupElasticMock();

        // Setup PostgresUtils with mock pool (injected in setupPgMock)
        postgresUtils = new PostgresUtils({ type: 'postgresql' } as any, new Summary('test', {} as any));
        sinon.stub(postgresUtils, 'createTables').resolves();
        await postgresUtils.init();

        // Stub factories to return our mocks
        sinon.stub(DatabaseFactory, 'getDatabaseUtils').returns(postgresUtils);
        sinon.stub(ElasticsearchFactory, 'getElasticUtils').returns(elasticMock);

        // Stub HTTP requests
        requestStub = sinon.stub(RequestDelegate, 'doRequest');
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should harvest records from CSW and push them to ES', async () => {
        // Prepare mock responses
        const capabilitiesXml = fs.readFileSync('test/data/csw/GetCapabilities.xml', 'utf8');
        const hitsXml = fs.readFileSync('test/data/csw/GetRecordsHits.xml', 'utf8');
        const resultsXml = fs.readFileSync('test/data/csw/GetRecordsResults.xml', 'utf8');

        // Configure request stub with curated responses
        requestStub.callsFake((config) => {
            if (config.qs?.request === 'GetCapabilities') return capabilitiesXml;
            if (config.qs?.resultType === 'hits') return hitsXml;
            if (config.qs?.resultType === 'results') return resultsXml;
            return resultsXml;
        });

        // Importer settings
        const settings: any = {
            id: 'test-csw',
            type: 'csw',
            sourceURL: 'http://example.com/csw',
            source: 'test-source',
            index: 'test-index',
            step: 'all',
            catalogIds: [1]
        };

        const importer = new CswImporter(settings);

        // Execute importer (CSW Harvest -> DB Upsert -> Catalog Mapping -> ES Index)
        await new Promise<void>((resolve, reject) => {
            importer.run().subscribe({
                complete: resolve,
                error: reject
            });
        });

        // Verification: ElasticSearch Operation
        // We verify that the Ingrid catalog correctly processed the record read from the mock database
        expect(elasticMock.addOperationChunksToBulk.called, 'ElasticsearchUtils.addOperationChunksToBulk should be called').to.be.true;
        const operations = elasticMock.addOperationChunksToBulk.getCall(0).args[0];
        const indexOp = operations.find(op => op.operation === 'index');

        expect(indexOp, 'Should contain an index operation').to.exist;
        expect(indexOp._id).to.equal('test-uuid-1');
        expect(indexOp.document.title).to.equal('Test Record 1');
        expect(indexOp._index).to.equal('harvester');
    });
});
