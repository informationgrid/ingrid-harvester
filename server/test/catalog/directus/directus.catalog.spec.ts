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
import type { DirectusCatalogSettings } from '@shared/catalog.js';
import { Summary } from '../../../app/model/summary.js';
import { DatabaseFactory } from '../../../app/persistence/database.factory.js';
import type { Bucket } from '../../../app/model/bucket.js';
import { IngridDirectusCatalog } from '../../../app/profiles/ingrid/catalog/directus.catalog.js';
import { ConfigService } from '../../../app/services/config/ConfigService.js';
import { RequestDelegate } from '../../../app/utils/http-request.utils.js';

chai.use(chaiAsPromised.default);
const expect = chai.expect;

const BASE = 'http://directus.test/ingest/v1';
const IMPORTS = `${BASE}/catalogs/cat-1/imports`;

class TestDirectusCatalog extends IngridDirectusCatalog {
    protected static POLL_INTERVAL_MS = 1;
    protected static POLL_TIMEOUT_MS = 50;
}

type Call = { method: string, uri: string, body: any, headers: Record<string, string> };

function response(status: number, body?: any) {
    const text = body == null ? '' : typeof body == 'string' ? body : JSON.stringify(body);
    return {
        ok: status >= 200 && status < 300,
        status,
        statusText: String(status),
        json: async () => JSON.parse(text),
        text: async () => text,
    };
}

function session(state: string, extra: object = {}) {
    return { catalog_id: 'cat-1', import_id: 'imp-1', mode: 'incremental', state, ...extra };
}

function ingridDoc(id: string, extra: object = {}): any {
    return { id, title: `Title ${id}`, metadata: { datasource: { type: 'csw' } }, ingrid: { document_type: 'InGridGeoDataset' }, ...extra };
}

function bucket(docs: { doc: any, deleted?: Date }[], services: any[] = []): Bucket<any> {
    return {
        anchor_id: docs[0].doc.id,
        documents: new Map(docs.map((d, i) => [i + 1, { document: d.doc, deleted: d.deleted }])),
        operatingServices: new Map(services.map((s, i) => [100 + i, s])),
    };
}

describe('IngridDirectusCatalog', function () {
    let sandbox: sinon.SinonSandbox;
    let calls: Call[];
    let sessionStates: any[];
    let database: { getDocumentIdsBySourceAndCatalog: sinon.SinonStub };
    let summary: Summary;

    function makeCatalog(batchSize = 2): TestDirectusCatalog {
        const settings: DirectusCatalogSettings = {
            id: 7, type: 'directus', url: BASE + '/', name: 'directus',
            settings: { catalogId: 'cat-1', apiKey: 'secret', batchSize },
        };
        summary = new Summary('test', {});
        return new TestDirectusCatalog(settings, summary);
    }

    beforeEach(function () {
        sandbox = sinon.createSandbox();
        calls = [];
        sessionStates = [session('completed')];
        database = { getDocumentIdsBySourceAndCatalog: sinon.stub() };
        // the stub of another spec file (root hook, see TASK-066) may already be active
        if (!('restore' in DatabaseFactory.getDatabaseUtils)) {
            sandbox.stub(DatabaseFactory, 'getDatabaseUtils').returns(database as any);
        }
        else {
            (DatabaseFactory.getDatabaseUtils as sinon.SinonStub).returns(database as any);
        }
        sandbox.stub(RequestDelegate, 'doRequest').callsFake(async (config: any) => {
            const call: Call = { method: config.method, uri: config.uri, body: config.body ? JSON.parse(config.body) : undefined, headers: config.headers };
            calls.push(call);
            if (call.method == 'POST' && call.uri == IMPORTS) return response(201, session('waiting', { mode: call.body.mode }));
            if (call.method == 'POST' && call.uri.endsWith('/operations')) return response(202);
            if (call.method == 'POST' && call.uri.endsWith('/commit')) return response(202);
            if (call.method == 'GET') return response(200, sessionStates.length > 1 ? sessionStates.shift() : sessionStates[0]);
            if (call.method == 'DELETE') return response(200);
            return response(404, 'not found');
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    const ops = (method: string, suffix: string) => calls.filter(c => c.method == method && c.uri.endsWith(suffix));

    describe('import session', function () {

        it('starts no session if nothing is to be imported', async function () {
            const catalog = makeCatalog();
            await catalog.importIntoCatalog([]);
            await catalog.flushImport();
            expect(calls).to.be.empty;
        });

        it('starts an incremental session with the first batch, sends batches, commits and polls', async function () {
            const catalog = makeCatalog(2);
            sessionStates = [session('processing'), session('completed', {
                operations: { received: { upsert: 2, delete: 1, total: 3 }, processed: 3, failed: 0 },
            })];

            await catalog.importIntoCatalog([{ operation: 'upsert', record: { id: 'a' } }]);
            expect(calls).to.be.empty;
            await catalog.importIntoCatalog([{ operation: 'upsert', record: { id: 'b' } }, { operation: 'delete', record: { id: 'c' } }]);
            await catalog.flushImport();

            expect(calls.map(c => `${c.method} ${c.uri.replace(BASE, '')}`)).to.deep.equal([
                'POST /catalogs/cat-1/imports',
                'POST /catalogs/cat-1/imports/imp-1/operations',
                'POST /catalogs/cat-1/imports/imp-1/operations',
                'POST /catalogs/cat-1/imports/imp-1/commit',
                'GET /catalogs/cat-1/imports/imp-1',
                'GET /catalogs/cat-1/imports/imp-1',
            ]);
            expect(calls[0].body).to.deep.equal({ mode: 'incremental' });
            expect(calls[0].headers['x-api-key']).to.equal('secret');
            expect(calls[1].body).to.deep.equal({ upsert: [{ id: 'a' }, { id: 'b' }] });
            expect(calls[2].body).to.deep.equal({ delete: [{ id: 'c' }] });
            expect(summary.numDocs).to.equal(2);
            expect(summary.counters).to.deep.equal({ directusReceived: 3, directusProcessed: 3, directusFailed: 0 });
            expect(summary.numErrors).to.equal(0);
            expect(summary.errors).to.be.empty;
        });

        it('reports a failed session and its errors in the summary', async function () {
            const catalog = makeCatalog();
            sessionStates = [session('failed', {
                operations: { received: { upsert: 1, delete: 0, total: 1 }, processed: 0, failed: 1 },
                errors: [{ object: { id: 'a' }, code: 'INVALID', message: 'title missing' }],
            })];

            await catalog.importIntoCatalog([{ operation: 'upsert', record: { id: 'a' } }]);
            await catalog.flushImport();

            expect(summary.counters.directusFailed).to.equal(1);
            // one per rejected record + one for the failed session, as CswCatalog
            expect(summary.numErrors).to.equal(2);
            expect(summary.errors).to.have.length(2);
            expect(summary.errors.every(e => e.type == 'catalog')).to.be.true;
            expect(summary.errors[0].error).to.contain("'a'").and.contain('INVALID').and.contain('title missing');
            expect(summary.errors[1].error).to.contain('failed');
        });

        it('reports one error per rejected record in a completed session', async function () {
            const catalog = makeCatalog();
            sessionStates = [session('completed', {
                operations: { received: { upsert: 2, delete: 0, total: 2 }, processed: 2, failed: 1 },
                errors: [{ object: { id: 'a' }, code: 'INDEXING_FAILED', message: 'Invalid document' }],
            })];

            await catalog.importIntoCatalog([{ operation: 'upsert', record: { id: 'a' } }, { operation: 'upsert', record: { id: 'b' } }]);
            await catalog.flushImport();

            expect(summary.numErrors).to.equal(1);
            expect(summary.errors).to.have.length(1);
            expect(summary.errors[0].error).to.contain('INDEXING_FAILED');
            expect(summary.counters.directusProcessed).to.equal(2);
        });

        it('reports an error if the session does not finish in time', async function () {
            const catalog = makeCatalog();
            sessionStates = [session('processing')];

            await catalog.importIntoCatalog([{ operation: 'upsert', record: { id: 'a' } }]);
            await catalog.flushImport();

            expect(summary.numErrors).to.equal(1);
            expect(summary.errors).to.have.length(1);
            expect(summary.errors[0].error).to.contain('not finished');
        });

        it('aborts the session if the import fails before the commit', async function () {
            const catalog = makeCatalog(1);
            // the first bucket is sent (session started), the second one fails
            const processBucket = sandbox.stub(catalog, 'processBucket');
            processBucket.onFirstCall().resolves([{ operation: 'upsert', record: { id: 'a' } }]);
            processBucket.onSecondCall().rejects(new Error('boom'));
            (catalog as any).database.streamBuckets = async function* () {
                yield bucket([{ doc: ingridDoc('a') }]);
                yield bucket([{ doc: ingridDoc('b') }]);
            };
            sandbox.stub(catalog as any, 'getBucketQuery').returns('');

            await expect(catalog.import('tx', {} as any, { next: () => {} } as any)).to.be.rejectedWith('boom');

            expect(ops('DELETE', '/imports/imp-1')).to.have.length(1);
            expect(ops('POST', '/commit')).to.be.empty;
        });

        it('throws on an error response', async function () {
            (RequestDelegate.doRequest as sinon.SinonStub).callsFake(async () => response(401, 'Unauthorized'));
            const catalog = makeCatalog(1);
            await expect(catalog.importIntoCatalog([{ operation: 'upsert', record: { id: 'a' } }])).to.be.rejectedWith('401');
        });
    });

    describe('deleting', function () {

        it('deleteRecordsForDatasource sends deletes for the records of the datasource in an incremental session', async function () {
            sandbox.stub(ConfigService, 'getHarvesters').returns([{ id: 3, sourceURL: 'http://csw.test' } as any]);
            database.getDocumentIdsBySourceAndCatalog.resolves(['a', 'b', 'c']);
            const catalog = makeCatalog(2);

            await catalog.deleteRecordsForDatasource(3);

            expect(database.getDocumentIdsBySourceAndCatalog.calledOnceWith('http://csw.test', 7)).to.be.true;
            expect(calls[0].body).to.deep.equal({ mode: 'incremental' });
            expect(ops('POST', '/operations').map(c => c.body)).to.deep.equal([
                { delete: [{ id: 'a' }, { id: 'b' }] },
                { delete: [{ id: 'c' }] },
            ]);
            expect(ops('POST', '/commit')).to.have.length(1);
            // no polling of the session (user action)
            expect(ops('GET', '/imports/imp-1')).to.be.empty;
        });

        it('deleteRecordsForDatasource returns right away while Directus is still processing', async function () {
            sandbox.stub(ConfigService, 'getHarvesters').returns([{ id: 3, sourceURL: 'http://csw.test' } as any]);
            database.getDocumentIdsBySourceAndCatalog.resolves(['a']);
            sessionStates = [session('processing')];
            const catalog = makeCatalog();

            await catalog.deleteRecordsForDatasource(3);

            expect(ops('POST', '/commit')).to.have.length(1);
            expect(summary.errors).to.be.empty;
        });

        it('deleteRecordsForDatasource does nothing for an unknown datasource', async function () {
            sandbox.stub(ConfigService, 'getHarvesters').returns([]);
            const catalog = makeCatalog();
            await catalog.deleteRecordsForDatasource(3);
            expect(calls).to.be.empty;
            expect(database.getDocumentIdsBySourceAndCatalog.called).to.be.false;
        });

        it('deleteCatalog deletes the records of every datasource still connected to the catalog', async function () {
            sandbox.stub(ConfigService, 'getHarvesters').returns([
                { id: 1, sourceURL: 'http://one.test', catalogIds: [7] },
                { id: 2, sourceURL: 'http://two.test', catalogIds: [5, 7] },
                { id: 3, sourceURL: 'http://other.test', catalogIds: [5] },
            ] as any);
            database.getDocumentIdsBySourceAndCatalog.withArgs('http://one.test', 7).resolves(['a']);
            database.getDocumentIdsBySourceAndCatalog.withArgs('http://two.test', 7).resolves(['b', 'c']);
            const catalog = makeCatalog();

            await catalog.deleteCatalog();

            expect(database.getDocumentIdsBySourceAndCatalog.callCount).to.equal(2);
            expect(calls.filter(c => c.uri == IMPORTS).map(c => c.body)).to.deep.equal([{ mode: 'incremental' }, { mode: 'incremental' }]);
            expect(ops('POST', '/operations').map(c => c.body)).to.deep.equal([
                { delete: [{ id: 'a' }] },
                { delete: [{ id: 'b' }, { id: 'c' }] },
            ]);
            expect(ops('POST', '/commit')).to.have.length(2);
            // no polling of the session (user action)
            expect(calls.filter(c => c.method == 'GET')).to.be.empty;
        });

        it('deleteCatalog sends nothing to Directus without a connected datasource', async function () {
            sandbox.stub(ConfigService, 'getHarvesters').returns([{ id: 3, sourceURL: 'http://other.test', catalogIds: [5] }] as any);
            const catalog = makeCatalog();
            await catalog.deleteCatalog();
            expect(calls).to.be.empty;
            expect(database.getDocumentIdsBySourceAndCatalog.called).to.be.false;
        });

        it('deleteCatalog aborts the session and rethrows if Directus rejects the commit', async function () {
            sandbox.stub(ConfigService, 'getHarvesters').returns([{ id: 1, sourceURL: 'http://one.test', catalogIds: [7] }] as any);
            database.getDocumentIdsBySourceAndCatalog.resolves(['a']);
            (RequestDelegate.doRequest as sinon.SinonStub).callsFake(async (config: any) => {
                const call: Call = { method: config.method, uri: config.uri, body: config.body ? JSON.parse(config.body) : undefined, headers: config.headers };
                calls.push(call);
                if (call.method == 'POST' && call.uri == IMPORTS) return response(201, session('waiting'));
                if (call.method == 'POST' && call.uri.endsWith('/operations')) return response(202);
                if (call.method == 'POST' && call.uri.endsWith('/commit')) return response(400, 'Invalid request');
                if (call.method == 'DELETE') return response(200);
                return response(404, 'not found');
            });
            const catalog = makeCatalog();

            await expect(catalog.deleteCatalog()).to.be.rejectedWith('400');

            expect(ops('DELETE', '/imports/imp-1')).to.have.length(1);
        });
    });

    describe('processBucket', function () {

        it('upserts the main document with its id and deletes duplicates with other ids', async function () {
            const catalog = makeCatalog();
            const result = await catalog.processBucket(bucket([{ doc: ingridDoc('a') }, { doc: ingridDoc('b') }]), {} as any);
            expect(result.map(op => [op.operation, op.record.id])).to.deep.equal([['delete', 'b'], ['upsert', 'a']]);
            expect(result[1].record.title).to.equal('Title a');
        });

        it('deletes the document if all documents of the bucket are deleted', async function () {
            const catalog = makeCatalog();
            const deleted = new Date();
            const result = await catalog.processBucket(bucket([{ doc: ingridDoc('a'), deleted }]), {} as any);
            expect(result).to.deep.equal([{ operation: 'delete', record: { id: 'a' } }]);
        });

        it('resolves the CSW coupling', async function () {
            const catalog = makeCatalog();
            const service = { id: 's', title: 'Service', ingrid: { document_type: 'InGridGeoService' } };
            const result = await catalog.processBucket(bucket([{ doc: ingridDoc('a') }], [service]), {} as any);
            expect(result[0].record.ingrid.cross_references).to.deep.equal([{
                uuid: 's', name: 'Service', document_type: 'InGridGeoService', description: undefined,
                reference_type: 'Gekoppelte Daten', direction: 'IN',
            }]);
        });

        it('does not send documents in a deprecated index format', async function () {
            const catalog = makeCatalog();
            const result = await catalog.processBucket(bucket([{ doc: { uuid: 'x' } }]), {} as any);
            expect(result).to.be.null;
            expect(summary.numErrors).to.equal(1);
            expect(summary.errors).to.deep.equal([{ type: 'catalog', error: summary.errors[0].error }]);
        });
    });
});
