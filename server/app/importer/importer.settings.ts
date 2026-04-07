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

import type { CatalogType } from '@shared/catalog.js';

export type ImporterSettings = {
    priority?: number,
    blacklistedIds?: string[],
    // catalogId: string,  // deprecated - this is the old, DiPlanung-centric catalog
    catalogIds: number[],
    cron?: {
        full: CronData,
        incr: CronData
    },
    customCode?: string,
    dateSourceFormats?: string[],
    defaultAttribution?: string,
    defaultAttributionLink?: string,
    defaultDCATCategory?: string[],
    // Ingrid-PlugDescription
    iPlugId?: string,
    partner?: string,
    provider?: string,
    datatype?: string,
    dataSourceName?: string,
    boost?: number,
    description?: string,
    disable?: boolean,
    dryRun?: boolean,
    id?: number,
    maxConcurrent: number,
    maxRecords?: number,
    proxy?: string,
    showCompleteSummaryInfo?: boolean,
    skipUrlCheckOnHarvest?: boolean,
    startPosition?: number,
    type: string,
    whitelistedIds?: string[],
    rejectUnauthorizedSSL?: boolean,
    rules?: {
        containsDocumentsWithData?: boolean,
        containsDocumentsWithDataBlacklist?: string
    },
    timeout: number,
    sourceURL: string
}

export type ImporterCapabilities = {
    isIncrementalSupported: boolean;
    supportedCatalogTypes: CatalogType[];
};

export type ImporterType = 'CKAN' | 'CSW' | 'DCATAPDE' | 'DCATAPPLU' | 'GENESIS' | 'JSON' | 'KLD' | 'OAI' | 'SPARQL' | 'WFS' | 'WFS.FIS' | 'WFS.MS' | 'WFS.XPLAN' | 'WFS.XPLAN.SYN';

export type ImporterTypeInfo = {
    type: ImporterType;
    defaults: ImporterSettings & Record<string, any>;
    capabilities: ImporterCapabilities;
};

export type CronData = {
    pattern: string;
    active: boolean;
};

export const defaultImporterSettings: ImporterSettings = {
    type: null,
    maxRecords: 100,
    startPosition: 0,
    // catalogId: null,
    catalogIds: [],
    rejectUnauthorizedSSL: true,
    rules: {
        containsDocumentsWithData: false
    },
    maxConcurrent: 1,
    skipUrlCheckOnHarvest: false,
    timeout: 60000,
    sourceURL: null
};
