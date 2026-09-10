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

import { type ImporterIntegrationTestCase } from '../utils/integration-test-runner.js';

export const cswTestcase = {
    mocks: [
        {
            match: { query: { request: 'GetCapabilities' }},
            fixture: 'input/GetCapabilities.xml'
        },
        {
            match: { query: { resultType: 'hits' }},
            fixture: 'input/GetRecordsHits.xml'
        },
        {
            match: { query: { resultType: 'results' }},
            fixture: 'input/GetRecordsResults.xml'
        },
        {
            match: { method: 'POST', bodyMatch: (body) => body.indexOf('GetCapabilities') !== -1 },
            fixture: 'input/GetCapabilities.xml'
        },
        {
            match: { method: 'POST', bodyMatch: (body) =>
                    /<csw:SearchResults numberOfRecordsMatched="\d+" numberOfRecordsReturned="\d+" elementSet="summary" nextRecord="\d+"\/>/.test(body)
            },
            fixture: 'input/GetRecordsHits.xml'
        },
        {
            match: { method: 'POST', bodyMatch: (body) => body.indexOf('gmd:MD_Metadata') !== -1 },
            fixture: 'input/GetRecordsResults.xml'
        }
    ],
    expectedDocsDir: 'elasticsearch'
} satisfies Partial<ImporterIntegrationTestCase<any>>;

export const wfsTestcase = {
    mocks: [
        {
            match: { query: { request: 'GetCapabilities' }},
            fixture: 'input/GetCapabilities.xml'
        }
    ],
    expectedDocsDir: 'elasticsearch'
}
