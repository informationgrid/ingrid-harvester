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

import type { ImporterSettings } from '../../app/importer/importer.settings.js';
import type { ImporterIntegrationTestCase } from '../utils/integration-test-runner.js';
import type { EsCompareOptions } from '../utils/test-utils.js';

// Which deprecated mapping an importer's documents fall into depends on its mapper's default
// document kind (see the getDefaultDocumentKind() overrides in ingrid.*.mapper.ts: ckan/dcatapde/genesis
// resolve to 'opendata', csw/wfs to 'ingrid'). Keep in sync when a new opendata-family importer type is added.
const OPENDATA_IMPORTER_TYPES = new Set(['CKAN', 'DCATAPDE', 'GENESIS']);

// comparison rules for deprecated-format documents (formerly hard-coded in compareEsDocuments()):
// `extras` is not compared, the coupling arrays (refering.object_reference, refering_service_uuid)
// regardless of order, and the IDF structurally as XML
const DEPRECATED_COMPARE_OPTIONS: EsCompareOptions = {
    excluded: ['extras', 'refering', 'refering_service_uuid'],
    unordered: ['refering.object_reference', 'refering_service_uuid'],
    xml: ['idf'],
};

/**
 * Targets the test case at the deprecated mapping matching its importer type, so the mapper builds
 * deprecated-format documents, and compares them with the deprecated format's rules.
 */
export function withDeprecatedMapping<T extends ImporterSettings>(testCase: ImporterIntegrationTestCase<T>): ImporterIntegrationTestCase<T> {
    const mappingFile = OPENDATA_IMPORTER_TYPES.has(testCase.settings.type)
        ? 'opendata-mapping.deprecated'
        : 'default-mapping.deprecated';
    return { ...testCase, mappingFile, compareOptions: DEPRECATED_COMPARE_OPTIONS };
}
