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

export type SparqlSettings = {
    query: string,               // SPARQL SELECT query executed against the endpoint; UI-configurable
    filterTags?: string[],       // skip records whose keywords don't include at least one of these tags; backend-only (not in UI)
    filterThemes?: string[],     // Deprecated? theme filter; declared but not used in mapper; backend-only
    defaultProvider?: string,    // Deprecated? default provider attribution; declared but not used in mapper; backend-only
    recordFilter?: string        // Deprecated? record filter; declared but not used in mapper; backend-only
} & ImporterSettings;

export const sparqlDefaults: SparqlSettings = {
    ...defaultImporterSettings,
    query: null
};

export const sparqlCapabilities: ImporterCapabilities = {
    isIncrementalSupported: false,
    supportedCatalogTypes: ['elasticsearch']
};
