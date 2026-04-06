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

import type { ImporterCapabilities, ImporterSettings } from '../../importer.settings.js';
import { DefaultImporterSettings } from '../../importer.settings.js';

/**
 * GENESIS-specific configuration, isolated under `typeConfig` to keep
 * protocol-specific settings separate from the shared ImporterSettings.
 *
 * Authentication: either provide username + password, or an apiToken
 * (which will be used as the password with the fixed username 'Gast').
 */
export type GenesisTypeConfig = {
    /** GENESIS login username */
    username?: string;
    /** GENESIS login password */
    password?: string;
    /**
     * Alternative: API token used as the password.
     * When set, the fixed username 'Gast' is used.
     */
    apiToken?: string;
    /** Delay in milliseconds between consecutive API calls to avoid rate limiting. Default: 500 */
    requestDelayMs: number;
    /**
     * API `selection` patterns (may contain wildcards, e.g. "11111*") passed to
     * /catalogue/tables. One request is made per entry.
     */
    tableSelections: string[];
    /**
     * Publisher/contact metadata for DCAT-AP.de output.
     * Maps to dct:publisher, dcat:contactPoint, vcard:fn, foaf:name, vcard:hasEmail.
     */
    publisher?: {
        /** Organization name */
        name: string;
        /** Contact email URI, e.g. "mailto:info@destatis.de" */
        email?: string;
    };
    /** EU Data Theme URI — maps to dcat:theme */
    theme?: string;
    /** License URI — maps to dct:license, e.g. "http://dcat-ap.de/def/licenses/dl-by-de/2.0" */
    licenseUrl?: string;
    /** Contributor registry URI — maps to dcatde:contributorID */
    contributorId?: string;
    /**
     * URL template for CSV downloads. Use `{code}` as placeholder for the table code.
     * e.g. "https://www-genesis.destatis.de/genesis-old/downloads/00/tables/{code}_00.csv"
     */
    downloadUrlTemplate?: string;
};

export type GenesisSettings = {
    typeConfig: GenesisTypeConfig;
} & ImporterSettings;

export const defaultGenesisSettings: GenesisSettings = {
    ...DefaultImporterSettings,
    typeConfig: {
        requestDelayMs: 500,
        tableSelections: [],
    }
};

export const genesisCapabilities: ImporterCapabilities = {
    isIncrementalSupported: false,
    supportedCatalogTypes: ['elasticsearch', 'piveau']
};
