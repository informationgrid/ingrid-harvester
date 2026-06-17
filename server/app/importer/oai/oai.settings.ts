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

import type { ImporterCapabilities, ImporterSettings } from '../importer.settings.js';
import { defaultImporterSettings } from '../importer.settings.js';

export type OaiSettings = {
    metadataPrefix?: string,     // OAI-PMH metadata format identifier (e.g. 'iso19139', 'oai_dc'); determines parser class and XPath expressions; UI-configurable
    set?: string,                // OAI-PMH set identifier for selective harvesting; passed as query parameter in ListRecords; UI-configurable
    from?: Date,                 // OAI-PMH lower date bound (ISO format); only harvest records modified on or after this date; UI-configurable
    until?: Date,                // OAI-PMH upper date bound (ISO format); only harvest records modified on or before this date; UI-configurable
    eitherKeywords: string[]     // record must match at least one of these keywords to be included; UI-configurable
} & ImporterSettings;

export const oaiDefaults: OaiSettings = {
    ...defaultImporterSettings,
    eitherKeywords: [],
    metadataPrefix: '',
    set: ''
};

export const oaiCapabilities: ImporterCapabilities = {
    isIncrementalSupported: false,
    supportedCatalogTypes: ['elasticsearch']
};
