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
import type { Observer } from 'rxjs';
import { CswCatalog } from '../../app/catalog/csw/csw.catalog.js';
import type { ImportLogMessage } from '../../app/model/import.result.js';
import type { ImporterSettings } from '../../app/importer/importer.settings.js';
import { Importer, HarvestRunCancelledError } from '../../app/importer/importer.js';
import { DatabaseFactory } from '../../app/persistence/database.factory.js';
import { ElasticsearchFactory } from '../../app/persistence/elastic.factory.js';
import { ProfileFactoryLoader } from '../../app/profiles/profile.factory.loader.js';

chai.use(chaiAsPromised.default);
const expect = chai.expect;

const BASE_SETTINGS: ImporterSettings = {
    id: 1,
    type: 'test',
    sourceURL: 'http://source.test',
    catalogIds: [],
    index: 'test-index',
};

class TestImporter extends Importer<ImporterSettings> {
    harvestImpl: () => Promise<number> = () => Promise.resolve(5);

    protected getDefaultSettings(): ImporterSettings {
        return BASE_SETTINGS;
    }

    protected async harvest(): Promise<number> {
        return this.harvestImpl();
    }
}

function collectMessages(importer: TestImporter): Promise<ImportLogMessage[]> {
    return new Promise((resolve, reject) => {
        const messages: ImportLogMessage[] = [];
        importer.run(false).subscribe({
            next: msg => messages.push(msg),
            error: reject,
            complete: () => resolve(messages),
        });
    });
}

describe('Importer cancel paths', function () {
    let sandbox: sinon.SinonSandbox;
    let mockDatabase: any;
    let mockProfile: any;

    beforeEach(function () {
        sandbox = sinon.createSandbox();

        mockDatabase = {
            beginTransaction: sandbox.stub().resolves(new Date('2024-01-15T10:00:00.000Z')),
            commitTransaction: sandbox.stub().resolves(),
            rollbackTransaction: sandbox.stub().resolves(),
            rollbackSourceImport: sandbox.stub().resolves(7),
            nonFetchedPercentage: sandbox.stub().resolves(0),
            deleteNonFetchedDatasets: sandbox.stub().resolves(),
        };

        mockProfile = {
            getIndexSettings: sandbox.stub().returns({}),
            getElasticQueries: sandbox.stub().returns({}),
            getPostgresQueries: sandbox.stub().returns({}),
            getCatalog: sandbox.stub().resolves({}),
        };

        sandbox.stub(DatabaseFactory, 'getDatabaseUtils').returns(mockDatabase);
        sandbox.stub(ElasticsearchFactory, 'getElasticUtils').returns({} as any);
        sandbox.stub(ProfileFactoryLoader, 'get').returns(mockProfile as any);
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('Phase 1 cancel (transaction not yet committed)', function () {
        it('calls rollbackTransaction, does not call rollbackSourceImport, emits cancelled: true', async function () {
            const importer = new TestImporter({ ...BASE_SETTINGS, catalogIds: [] });
            importer.harvestImpl = async () => {
                importer.cancel();
                return 1;
            };

            const messages = await collectMessages(importer);

            expect(mockDatabase.rollbackTransaction.calledOnce).to.be.true;
            expect(mockDatabase.rollbackSourceImport.called).to.be.false;
            expect(mockDatabase.commitTransaction.called).to.be.false;

            const cancelledMsg = messages.find(m => m.cancelled === true);
            expect(cancelledMsg).to.exist;
            expect(cancelledMsg.complete).to.be.true;
        });
    });

    describe('Phase 2 cancel (transaction committed, CSW catalog processed)', function () {
        it('calls rollbackSourceImport and rollbackTargetCatalog on processed CSW catalog, emits cancelled: true', async function () {
            const mockCswCatalog = sinon.createStubInstance(CswCatalog);
            (mockCswCatalog as any).settings = { id: 99, name: 'test-csw' };
            mockCswCatalog.process = sandbox.stub().callsFake(async () => {
                importer.cancel();
            });
            mockCswCatalog.rollbackTargetCatalog = sandbox.stub().resolves();

            mockProfile.getCatalog.resolves(mockCswCatalog);

            const importer = new TestImporter({ ...BASE_SETTINGS, catalogIds: [99, 100] });

            const messages = await collectMessages(importer);

            expect(mockDatabase.commitTransaction.calledOnce).to.be.true;
            expect(mockDatabase.rollbackTransaction.called).to.be.false;

            expect(mockDatabase.rollbackSourceImport.calledOnce).to.be.true;
            expect(mockDatabase.rollbackSourceImport.calledWith(
                BASE_SETTINGS.sourceURL,
                sinon.match.instanceOf(Date)
            )).to.be.true;

            expect(mockCswCatalog.rollbackTargetCatalog.calledOnce).to.be.true;

            const cancelledMsg = messages.find(m => m.cancelled === true);
            expect(cancelledMsg).to.exist;
            expect(cancelledMsg.complete).to.be.true;
        });
    });

    describe('Non-cancel error path', function () {
        it('calls rollbackTransaction, does not call rollbackSourceImport, does not emit cancelled: true', async function () {
            const importer = new TestImporter({ ...BASE_SETTINGS, catalogIds: [] });
            importer.harvestImpl = async () => {
                throw new Error('harvest failed');
            };

            const messages = await collectMessages(importer);

            expect(mockDatabase.rollbackTransaction.calledOnce).to.be.true;
            expect(mockDatabase.rollbackSourceImport.called).to.be.false;

            const cancelledMsg = messages.find(m => m.cancelled === true);
            expect(cancelledMsg).to.be.undefined;

            const completeMsg = messages.find(m => m.complete === true);
            expect(completeMsg).to.exist;
        });
    });
});
