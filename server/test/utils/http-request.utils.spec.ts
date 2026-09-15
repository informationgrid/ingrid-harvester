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
import { RequestDelegate, type RequestOptions } from '../../app/utils/http-request.utils.js';
import { CancellationScope, HarvestRunCancelledError } from '../../app/utils/cancellation.utils.js';

chai.use(chaiAsPromised.default);
const expect = chai.expect;

describe('RequestDelegate', function () {
    let sandbox: sinon.SinonSandbox;

    beforeEach(function () {
        sandbox = sinon.createSandbox();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('Configuration immutability', function () {
        it('preserves config.timeout across repeated executions without deleting it', async function () {
            sandbox.stub(globalThis, 'fetch').callsFake(() => Promise.resolve(new Response('ok', { status: 200 })));

            const config: RequestOptions = {
                uri: 'http://example.com/test',
                timeout: 5000
            };

            const delegate = new RequestDelegate(config);
            const res1 = await delegate.doRequest(0, 0);
            expect(res1).to.equal('ok');
            expect(config.timeout).to.equal(5000);

            const res2 = await delegate.doRequest(0, 0);
            expect(res2).to.equal('ok');
            expect(config.timeout).to.equal(5000);
        });
    });

    describe('Retry handling and per-attempt signals', function () {
        it('generates a fresh timeout signal per retry attempt and succeeds on subsequent attempt', async function () {
            const timeoutError = new DOMException('The operation was aborted due to timeout', 'TimeoutError');

            const fetchStub = sandbox.stub(globalThis, 'fetch');
            fetchStub.onFirstCall().rejects(timeoutError);
            fetchStub.onSecondCall().callsFake(() => Promise.resolve(new Response('retry success', { status: 200 })));

            const config: RequestOptions = {
                uri: 'http://example.com/retry-test',
                timeout: 2000
            };

            const result = await RequestDelegate.doRequest(config, 1, 10);
            expect(result).to.equal('retry success');
            expect(fetchStub.callCount).to.equal(2);

            const firstSignal: AbortSignal = fetchStub.firstCall.args[1]?.signal as AbortSignal;
            const secondSignal: AbortSignal = fetchStub.secondCall.args[1]?.signal as AbortSignal;

            expect(firstSignal).to.exist;
            expect(secondSignal).to.exist;
            expect(firstSignal).to.not.equal(secondSignal);
            expect(secondSignal.aborted).to.be.false;
        });

        it('exhausts retries and propagates the error when all attempts fail', async function () {
            const timeoutError = new DOMException('The operation was aborted due to timeout', 'TimeoutError');
            const fetchStub = sandbox.stub(globalThis, 'fetch').rejects(timeoutError);

            const config: RequestOptions = {
                uri: 'http://example.com/fail-test',
                timeout: 1000
            };

            await expect(RequestDelegate.doRequest(config, 2, 10)).to.be.rejectedWith(timeoutError);
            expect(fetchStub.callCount).to.equal(3);
        });
    });

    describe('Cancellation handling', function () {
        it('throws HarvestRunCancelledError immediately on user cancellation without retrying', async function () {
            const cancellationScope = new CancellationScope();
            cancellationScope.abort();

            const abortError = new DOMException('The operation was aborted', 'AbortError');
            const fetchStub = sandbox.stub(globalThis, 'fetch').rejects(abortError);

            const config: RequestOptions = {
                uri: 'http://example.com/cancel-test',
                timeout: 5000
            };

            await expect(new Promise((resolve, reject) => {
                cancellationScope.run(async () => {
                    try {
                        await RequestDelegate.doRequest(config, 3, 10);
                        resolve(undefined);
                    } catch (e) {
                        reject(e);
                    }
                });
            })).to.be.rejectedWith(HarvestRunCancelledError);

            expect(fetchStub.callCount).to.equal(1);
        });
    });
});
