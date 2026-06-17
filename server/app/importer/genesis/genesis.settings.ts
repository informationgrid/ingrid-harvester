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

export type GenesisTypeConfig = {
    username?: string;             // GENESIS login username; UI-configurable
    password?: string;             // GENESIS login password; UI-configurable
    apiToken?: string;             // alternative to username/password: used as password with fixed username 'Gast'; UI-configurable
    requestDelayMs: number;        // delay in milliseconds between consecutive API calls to avoid rate limiting (default: 500); UI-configurable
    statisticCodes: string[];      // API selection patterns (wildcards allowed, e.g. '11*') passed to /catalogue/statistics; UI-configurable
    publisher?: {
        name: string;              // organization name (dct:publisher, foaf:name, vcard:fn); UI-configurable
        email?: string;            // contact email URI, e.g. 'mailto:info@destatis.de' (vcard:hasEmail); UI-configurable
    };
    theme?: string;                // EU Data Theme URI (dcat:theme); UI-configurable
    licenseUrl?: string;           // license URI (dct:license); UI-configurable
    contributorId?: string;        // contributor registry URI (dcatde:contributorID); UI-configurable
    spatialUri?: string;           // spatial coverage URI (dct:spatial); UI-configurable
    statisticUrlTemplate?: string; // URL template for statistic landing page; use {code} as placeholder (dcat:landingPage); UI-configurable
    tableUrlTemplate?: string;     // URL template for table online resource; use {code} as placeholder; UI-configurable
};

export type GenesisSettings = {
    typeConfig: GenesisTypeConfig; // GENESIS-specific configuration (auth, statistic codes, publisher metadata); UI-configurable
} & ImporterSettings;

export const genesisDefaults: GenesisSettings = {
    ...defaultImporterSettings,
    typeConfig: {
        requestDelayMs: 500,
        statisticCodes: []
    }
};

export const genesisCapabilities: ImporterCapabilities = {
    isIncrementalSupported: false,
    supportedCatalogTypes: ['elasticsearch', 'piveau']
};
