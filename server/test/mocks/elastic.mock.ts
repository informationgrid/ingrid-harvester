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

import sinon from 'sinon';

/**
 * Sets up a mock Elasticsearch utility object with spies to verify operations.
 */
export function setupElasticMock(): any {
    return {
        addDocToBulk: sinon.stub().resolves({ queued: true }),
        addOperationChunksToBulk: sinon.stub().resolves({ queued: true }),
        sendBulkOperations: sinon.stub().resolves({ queued: false }),
        prepareIndex: sinon.stub().resolves(),
        prepareIndexWithName: sinon.stub().resolves(),
        isIndexPresent: sinon.stub().resolves(true),
        ping: sinon.stub().resolves(true),
        search: sinon.stub().resolves({ hits: { total: { value: 0 }, hits: [] } }),
        count: sinon.stub().resolves(0),
        scroll: sinon.stub().callsFake(async function* () {
            // Return empty generator by default
        }),
        bulkWithIndexName: sinon.stub().resolves({ queued: true }),
        index: sinon.stub().resolves(),
        init: sinon.stub().resolves(),
        finishIndex: sinon.stub().resolves(),
        addAlias: sinon.stub().resolves(),
        removeAlias: sinon.stub().resolves(),
        listAliases: sinon.stub().resolves([]),
        deleteIndex: sinon.stub().resolves(),
    };
}
