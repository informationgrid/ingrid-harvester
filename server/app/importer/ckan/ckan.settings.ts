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

import type { License } from '@shared/license.model.js';
import type { ImporterCapabilities, ImporterSettings } from '../importer.settings.js';
import { defaultImporterSettings } from '../importer.settings.js';

export type CkanSettings = {
    filterTags?: string[],             // skip datasets whose tags don't include at least one of these; UI-configurable
    filterGroups?: string[],           // skip datasets whose groups don't include at least one of these; UI-configurable
    providerPrefix?: string,           // prefix prepended to author/maintainer names; backend-only
    providerField?: ProviderField,     // Deprecated? intended to select which CKAN field to use as provider; unused in mapper; backend-only
    requestType?: 'ListWithResources' | 'Search', // CKAN API endpoint: 'Search' uses package_search, 'ListWithResources' uses current_package_list_with_resources; UI-configurable
    additionalSearchFilter?: string,   // Solr filter query appended to the Search API request; UI-configurable
    markdownAsDescription?: boolean,   // if true, dataset notes are rendered as markdown HTML; UI-configurable
    groupChilds?: boolean,             // Deprecated? intended for grouping child datasets; unused in importer and mapper; UI-configurable
    defaultLicense?: License;          // fallback license assigned to datasets that have no license; UI-configurable
} & ImporterSettings;

export type ProviderField = 'maintainer' | 'organization' | 'author';

export const ckanDefaults: CkanSettings = {
    ...defaultImporterSettings,
    filterTags: [],
    filterGroups: [],
    providerPrefix: '',
    providerField: 'organization',
    dateSourceFormats: [],
    requestType: 'Search',
    markdownAsDescription: true,
    groupChilds: false,
    defaultLicense: null
};

export const ckanCapabilities: ImporterCapabilities = {
    isIncrementalSupported: false,
    supportedCatalogTypes: ['elasticsearch', 'piveau']
}
