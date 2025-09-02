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

import { DefaultImporterSettings, ImporterSettings } from '../../importer.settings.js';
import { PluPlanState } from '../../model/dcatApPlu.model.js';

export type CswSettings = {
    resultType?: 'hits' | 'results',
    pluPlanState?: PluPlanState,
    maxServices: number,
    resolveOgcDistributions: boolean,
    harvestingMode: 'standard' | 'separate',
    eitherKeywords: string[],
    httpMethod: 'GET' | 'POST',
    recordFilter?: string,
    simplifyTolerance: number
} & ImporterSettings;

export const defaultCSWSettings: Partial<CswSettings> = {
    ...DefaultImporterSettings,
    maxServices: 30,
    resolveOgcDistributions: false,
    harvestingMode: 'standard',
    eitherKeywords: [],
    httpMethod: 'GET',
    resultType: 'results',
    simplifyTolerance: 0
};