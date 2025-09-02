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

import { Contact, Organization, Person } from '../../model/agent.js';
import { DefaultImporterSettings, ImporterSettings } from '../../importer.settings.js';
import { PluPlanState } from '../../model/dcatApPlu.model.js';

export type WfsSettings = {
    version: "2.0.0" | "1.1.0",
    memberElement: string,
    catalogId: string,
    pluPlanState: PluPlanState,
    contactCswUrl?: string,
    contactMetadata?: Contact,
    maintainer?: Person | Organization;
    count: number,
    resultType?: "hits" | "results",
    typename: string,
    eitherKeywords: string[],
    httpMethod: "GET" | "POST",
    featureFilter?: string,
    resolveWithFullResponse?: boolean
} & ImporterSettings;

export const defaultWfsSettings: Partial<WfsSettings> = {
    ...DefaultImporterSettings,
    eitherKeywords: [],
    httpMethod: 'GET',
    resultType: 'results'
};
