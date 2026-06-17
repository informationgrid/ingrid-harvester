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

export type DcatapdeSettings = {
    filterTags?: string[],                 // skip records whose keywords don't include at least one of these tags; UI-configurable
    filterThemes?: string[],               // skip records whose DCAT themes don't include at least one of these (matched by URI fragment); UI-configurable
    providerPrefix?: string,               // Deprecated? prefix prepended to provider names; backend-only
    dcatProviderField?: DCATProviderField, // Deprecated? which DCAT agent field to use as provider; backend-only
} & ImporterSettings;

export type DCATProviderField = 'contactPoint' | 'creator' | 'originator' | 'maintainer' | 'publisher';

export const dcatapdeDefaults: DcatapdeSettings = {
    ...defaultImporterSettings
};

export const dcatapdeCapabilities: ImporterCapabilities = {
    isIncrementalSupported: false,
    supportedCatalogTypes: ['elasticsearch', 'piveau']
};
