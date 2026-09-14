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
import log4js from 'log4js';
import sinon from 'sinon';
import type { CswCatalogSettings } from '@shared/catalog.js';
import { DatabaseFactory } from '../../../app/persistence/database.factory.js';
import { ProfileFactoryLoader } from '../../../app/profiles/profile.factory.loader.js';
import { RequestDelegate } from '../../../app/utils/http-request.utils.js';
import { IngridCswCatalog } from '../../../app/profiles/ingrid/catalog/csw.catalog.js';

chai.use(chaiAsPromised.default);
const expect = chai.expect;

const TRANSACTION_RESPONSE_3_DELETED = `<?xml version="1.0" encoding="UTF-8"?>
<csw:TransactionResponse xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" version="2.0.2">
  <csw:TransactionSummary>
    <csw:totalInserted>0</csw:totalInserted>
    <csw:totalUpdated>0</csw:totalUpdated>
    <csw:totalDeleted>3</csw:totalDeleted>
  </csw:TransactionSummary>
</csw:TransactionResponse>`;

const EXCEPTION_REPORT = `<?xml version="1.0" encoding="UTF-8"?>
<ExceptionReport xmlns="http://www.opengis.net/ows" version="1.2.0">
  <Exception exceptionCode="InvalidParameterValue"/>
</ExceptionReport>`;

const capturedEvents: Array<{ level: string; message: string }> = [];

before(function () {
    sinon.stub(DatabaseFactory, 'getDatabaseUtils').returns({} as any);
    sinon.stub(ProfileFactoryLoader, 'get').returns({} as any);
    log4js.configure({
        appenders: {
            capture: {
                type: {
                    configure: () => (event: any) => capturedEvents.push({
                        level: event.level.levelStr,
                        message: String(event.data[0]),
                    }),
                },
            },
        },
        categories: { default: { appenders: ['capture'], level: 'all' } },
    });
});

after(function () {
    sinon.restore();
});

function makeCatalog(): IngridCswCatalog {
    const settings: CswCatalogSettings = {
        id: 99,
        type: 'csw',
        url: 'http://csw.test',
        name: 'test',
        settings: { version: '2.0.2', outputSchema: '' },
    };
    const summary = { increment: sinon.stub(), numErrors: 0, errors: [] } as any;
    return new IngridCswCatalog(settings, summary);
}

describe('CswCatalog.rollbackTargetCatalog', function () {
    let sandbox: sinon.SinonSandbox;

    beforeEach(function () {
        capturedEvents.length = 0;
        sandbox = sinon.createSandbox();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('logs deleted count at INFO on TransactionResponse', async function () {
        sandbox.stub(RequestDelegate, 'doRequest').resolves(TRANSACTION_RESPONSE_3_DELETED);
        const catalog = makeCatalog();

        await catalog.rollbackTargetCatalog(42, new Date('2024-01-01T00:00:00.000Z'));

        const errorEvents = capturedEvents.filter(e => e.level === 'ERROR');
        const infoWithCount = capturedEvents.filter(e => e.level === 'INFO' && e.message.includes('3'));
        expect(errorEvents).to.be.empty;
        expect(infoWithCount).to.have.length.greaterThan(0);
    });

    it('logs at ERROR and does not rethrow on request failure', async function () {
        sandbox.stub(RequestDelegate, 'doRequest').rejects(new Error('network error'));
        const catalog = makeCatalog();

        await expect(catalog.rollbackTargetCatalog(42, new Date('2024-01-01T00:00:00.000Z'))).to.be.fulfilled;

        const errorEvents = capturedEvents.filter(e => e.level === 'ERROR');
        expect(errorEvents).to.have.length.greaterThan(0);
    });
});

describe('CswCatalog.deleteRecordsForDatasource', function () {
    let sandbox: sinon.SinonSandbox;

    beforeEach(function () {
        capturedEvents.length = 0;
        sandbox = sinon.createSandbox();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('logs deleted count at INFO on TransactionResponse', async function () {
        sandbox.stub(RequestDelegate, 'doRequest').resolves(TRANSACTION_RESPONSE_3_DELETED);
        const catalog = makeCatalog();

        await catalog.deleteRecordsForDatasource(42);

        const errorEvents = capturedEvents.filter(e => e.level === 'ERROR');
        const infoWithCount = capturedEvents.filter(e => e.level === 'INFO' && e.message.includes('3'));
        expect(errorEvents).to.be.empty;
        expect(infoWithCount).to.have.length.greaterThan(0);
    });

    it('logs at ERROR on ExceptionReport', async function () {
        sandbox.stub(RequestDelegate, 'doRequest').resolves(EXCEPTION_REPORT);
        const catalog = makeCatalog();

        await catalog.deleteRecordsForDatasource(42);

        const errorEvents = capturedEvents.filter(e => e.level === 'ERROR');
        expect(errorEvents).to.have.length.greaterThan(0);
    });
});
