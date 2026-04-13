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

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';

chai.use(chaiAsPromised.default);
import { RequestDelegate } from '../../../app/utils/http-request.utils.js';
import { GenesisImporter } from '../../../app/importer/genesis/genesis.importer.js';
import { GenesisMapper } from '../../../app/importer/genesis/genesis.mapper.js';
import type { GenesisSettings } from '../../../app/importer/genesis/genesis.settings.js';
import { genesisDefaults } from '../../../app/importer/genesis/genesis.settings.js';
import { DatabaseFactory } from '../../../app/persistence/database.factory.js';
import { ProfileFactoryLoader } from '../../../app/profiles/profile.factory.loader.js';

const expect = chai.expect;

// Stub infrastructure dependencies so the importer can be instantiated without
// a real database or profile configuration.
before(function () {
    const mockDatabase = {
        beginTransaction: sinon.stub().resolves('tx'),
        sendBulkData: sinon.stub().resolves(),
        addEntityToBulk: sinon.stub().resolves(),
        rollbackTransaction: sinon.stub().resolves(),
        commitTransaction: sinon.stub().resolves(),
        nonFetchedPercentage: sinon.stub().resolves(0),
        deleteNonFetchedDatasets: sinon.stub().resolves(),
    };
    const mockDocumentFactory = {
        createIndexDocument: sinon.stub().resolves({}),
        createDcatapdeDocument: sinon.stub().returns(''),
    };
    const mockProfile = {
        getIndexSettings: sinon.stub().returns({}),
        getElasticQueries: sinon.stub().returns({}),
        getImporter: sinon.stub(),
        getDocumentFactory: sinon.stub().returns(mockDocumentFactory),
        getCatalog: sinon.stub(),
    };
    sinon.stub(DatabaseFactory, 'getDatabaseUtils').returns(mockDatabase as any);
    sinon.stub(ProfileFactoryLoader, 'get').returns(mockProfile as any);
});

after(function () {
    sinon.restore();
});

const baseSettings: GenesisSettings = {
    ...genesisDefaults,
    partner: 'HE',
    sourceURL: 'https://genesis.example.com',
    dryRun: true,
    typeConfig: {
        ...genesisDefaults.typeConfig,
        tableSelections: ['12345*'],
    },
};

const catalogueResponse = (items: { Code: string; Content: string }[]) => ({
    Status: { Code: 0, Content: 'erfolgreich' },
    List: items,
});

const metadataResponse = (code: string) => ({
    Status: { Code: 0, Content: 'erfolgreich' },
    Object: {
        Code: code,
        Content: `Tabelle ${code}`,
        Updated: '01.01.2025 10:00:00h',
        Time: { From: '2020', To: '2023' },
        Structure: {},
    },
});

// Helper to run the importer and wait for completion
async function runImporter(importer: GenesisImporter): Promise<void> {
    return new Promise((resolve, reject) => {
        importer.run(false).subscribe({
            complete: resolve,
            error: reject,
        });
    });
}

describe('GenesisImporter — doApiRequest status codes', function () {

    let importer: GenesisImporter;
    let doRequestStub: sinon.SinonStub;

    beforeEach(function () {
        importer = new GenesisImporter(baseSettings);
        doRequestStub = sinon.stub(RequestDelegate, 'doRequest');
    });

    afterEach(function () {
        doRequestStub?.restore();
    });

    it('throws on authentication error status 98', async function () {
        doRequestStub.resolves({ Status: { Code: 98, Content: 'Kein Zugriff' } });
        await expect((importer as any).doApiRequest('/catalogue/tables', {}))
            .to.be.rejectedWith(/authentication failed.*98/i);
    });

    it('throws on authentication error status 99', async function () {
        doRequestStub.resolves({ Status: { Code: 99, Content: 'Ungültige Anmeldedaten' } });
        await expect((importer as any).doApiRequest('/catalogue/tables', {}))
            .to.be.rejectedWith(/authentication failed.*99/i);
    });

    it('returns null on status 104 (not found)', async function () {
        doRequestStub.resolves({ Status: { Code: 104, Content: 'Nicht gefunden' } });
        const result = await (importer as any).doApiRequest('/metadata/table', { name: 'X' });
        expect(result).to.be.null;
    });

    it('returns response normally for status 0', async function () {
        const response = { Status: { Code: 0, Content: 'erfolgreich' }, Object: { Code: 'X' } };
        doRequestStub.resolves(response);
        const result = await (importer as any).doApiRequest('/metadata/table', { name: 'X' });
        expect(result).to.deep.equal(response);
    });

    it('returns response normally for status 22', async function () {
        const response = { Status: { Code: 22, Content: 'OK' }, Object: { Code: 'Y' } };
        doRequestStub.resolves(response);
        const result = await (importer as any).doApiRequest('/metadata/table', { name: 'Y' });
        expect(result).to.deep.equal(response);
    });
});

describe('GenesisImporter — buildAuthHeaders', function () {

    it('uses apiToken as password with username "Gast"', function () {
        const importer = new GenesisImporter({
            ...baseSettings,
            typeConfig: { ...baseSettings.typeConfig, apiToken: 'my-token' },
        });
        const headers = (importer as any).buildAuthHeaders();
        expect(headers).to.deep.equal({ username: 'my-token' });
    });

    it('uses username and password from settings', function () {
        const importer = new GenesisImporter({
            ...baseSettings,
            typeConfig: { ...baseSettings.typeConfig, username: 'user1', password: 'pass1' },
        });
        const headers = (importer as any).buildAuthHeaders();
        expect(headers).to.deep.equal({ username: 'user1', password: 'pass1' });
    });

    it('falls back to "Gast"/"Gast" when neither is set', function () {
        const importer = new GenesisImporter(baseSettings);
        const headers = (importer as any).buildAuthHeaders();
        expect(headers).to.deep.equal({ username: 'Gast', password: 'Gast' });
    });
});

describe('GenesisImporter — processObject error paths', function () {

    let doRequestStub: sinon.SinonStub;

    beforeEach(function () {
        doRequestStub = sinon.stub(RequestDelegate, 'doRequest');
    });

    afterEach(function () {
        doRequestStub?.restore();
    });

    it('adds to skippedDocs when metadata returns no Object', async function () {
        // catalogue call returns one table
        doRequestStub.onFirstCall().resolves(catalogueResponse([{ Code: '12345-0001', Content: 'Test' }]));
        // metadata call returns response without Object
        doRequestStub.onSecondCall().resolves({ Status: { Code: 0, Content: 'ok' } });

        const importer = new GenesisImporter(baseSettings);
        await runImporter(importer);

        expect(importer.summary.skippedDocs).to.include('12345-0001');
        expect(importer.summary.errors).to.have.length(0);
    });

    it('adds to errors and skippedDocs when metadata fetch throws', async function () {
        doRequestStub.onFirstCall().resolves(catalogueResponse([{ Code: '12345-0002', Content: 'Test' }]));
        doRequestStub.onSecondCall().rejects(new Error('Network timeout'));

        const importer = new GenesisImporter(baseSettings);
        await runImporter(importer);

        expect(importer.summary.errors.some(e => e.error.includes('12345-0002'))).to.be.true;
    });

    it('counts numDocs for all attempted records including skipped', async function () {
        doRequestStub.onFirstCall().resolves(catalogueResponse([
            { Code: '12345-0001', Content: 'A' },
            { Code: '12345-0002', Content: 'B' },
        ]));
        // first metadata: no Object → skipped
        doRequestStub.onSecondCall().resolves({ Status: { Code: 0, Content: 'ok' } });
        // second metadata: valid
        doRequestStub.onThirdCall().resolves(metadataResponse('12345-0002'));

        const importer = new GenesisImporter(baseSettings);
        await runImporter(importer);

        expect(importer.summary.numDocs).to.equal(2);
        expect(importer.summary.skippedDocs).to.deep.equal(['12345-0001']);
    });

    it('adds to errors when table selection fetch fails', async function () {
        doRequestStub.rejects(new Error('Connection refused'));

        const importer = new GenesisImporter(baseSettings);
        await runImporter(importer);

        expect(importer.summary.errors.some(e => e.error.includes('12345*'))).to.be.true;
    });
}).timeout(10000);

describe('GenesisMapper — getTemporal()', function () {

    function makeMapper(time: { From?: string; To?: string }): GenesisMapper {
        const record = { Object: { Code: 'X', Content: 'X', Updated: '01.01.2025 00:00:00h', Time: time } };
        return new GenesisMapper(baseSettings, record, new Date(), { numDocs: 0, skippedDocs: [], errors: [] } as any);
    }

    it('handles year-only strings', function () {
        const result = makeMapper({ From: '2020', To: '2023' }).getTemporal();
        expect(result.gte).to.deep.equal(new Date(2020, 0, 1));
        expect(result.lte).to.deep.equal(new Date(2023, 11, 31));
    });

    it('handles DD.MM.YYYY date strings', function () {
        const result = makeMapper({ From: '01.01.2014', To: '01.01.2014' }).getTemporal();
        expect(result.gte).to.deep.equal(new Date(2014, 0, 1));
        expect(result.lte).to.deep.equal(new Date(2014, 0, 1));
    });

    it('returns undefined bounds for unrecognised format', function () {
        const result = makeMapper({ From: 'unknown' }).getTemporal();
        expect(result.gte).to.be.undefined;
    });

    it('returns undefined when Time has no From/To', function () {
        const result = makeMapper({}).getTemporal();
        expect(result).to.be.undefined;
    });
});
