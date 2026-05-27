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
import type { PluPlanState } from '../../model/dcatApPlu.model.js';

export type CswSettings = {
    resultType?: 'hits' | 'results',         // CSW GetRecords result mode; 'hits' = count only, 'results' = fetch records; backend-only (not in UI)
    pluPlanState?: PluPlanState,             // planning status assigned to all harvested records; UI-configurable (DiPlanung profile only)
    maxServices: number,                     // max dataset IDs per service-query chunk in 'separate' harvesting mode; UI-configurable
    resolveOgcDistributions: boolean,        // resolve WFS/WMS endpoints to fetch geometry (slow); UI-configurable (DiPlanung profile only)
    harvestingMode: 'standard' | 'separate', // 'standard' harvests all record types together; 'separate' queries services by dataset chunk; UI-configurable
    eitherKeywords: string[],                // record must match at least one of these keywords to be included; UI-configurable
    httpMethod: 'GET' | 'POST',              // HTTP method for CSW requests; UI-configurable
    recordFilter?: string,                   // OGC XML filter to restrict which records are harvested; UI-configurable
    simplifyTolerance: number                // Douglas-Peucker tolerance for polygon simplification (0 = off); UI-configurable (DiPlanung profile only)
} & ImporterSettings;

export const cswDefaults: CswSettings = {
    ...defaultImporterSettings,
    maxServices: 30,
    resolveOgcDistributions: false,
    harvestingMode: 'standard',
    eitherKeywords: [],
    httpMethod: 'GET',
    resultType: 'results',
    simplifyTolerance: 0
};

export const cswCapabilities: ImporterCapabilities = {
    isIncrementalSupported: true,
    supportedCatalogTypes: ['csw', 'elasticsearch']
};
