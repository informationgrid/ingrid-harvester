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
    priority?: number,                    // sort priority for search ranking; UI-configurable
    blacklistedIds?: string[],            // IDs to exclude from harvest; UI-configurable
    // catalogId: string,  // deprecated - this is the old, DiPlanung-centric catalog
    catalogIds: number[],                 // catalog IDs to assign harvested records to; UI-configurable
    cron?: {
        full: CronData,                   // schedule for full harvest runs; UI-configurable
        incr: CronData                    // schedule for incremental harvest runs; UI-configurable
    },
    customCode?: string,                  // JavaScript executed during mapping to override or extend field values; UI-configurable
    dateSourceFormats?: string[],         // date format strings for parsing source date values; backend-only
    defaultAttribution?: string,          // default attribution text for harvested records; backend-only
    defaultAttributionLink?: string,      // URL for the default attribution; backend-only
    defaultDCATCategory?: string[],       // default DCAT-AP theme categories assigned when source provides none; backend-only
    // Ingrid-PlugDescription
    iPlugId?: string,                     // iPlug identifier for Ingrid search index integration; UI-configurable (ingrid/zdm profile only)
    partner?: string,                     // Ingrid partner identifier; UI-configurable (ingrid/zdm profile only)
    provider?: string,                    // Ingrid provider identifier; UI-configurable (ingrid/zdm profile only)
    datatype?: string,                    // Ingrid datatype for index categorization; UI-configurable (ingrid/zdm profile only)
    dataSourceName?: string,              // Ingrid datasource name for index registration; UI-configurable (ingrid/zdm profile only)
    boost?: number,                       // Deprecated? search ranking boost factor; not used in current indexing; backend-only
    description?: string,                 // human-readable name for this harvester configuration; UI-configurable
    disable?: boolean,                    // if true, harvester is inactive and skipped on schedule; backend-only
    dryRun?: boolean,                     // if true, runs harvest without writing to index; backend-only
    id?: number,                          // internal database ID of this harvester configuration; backend-only
    maxConcurrent: number,                // max simultaneous HTTP requests during harvest; UI-configurable
    maxRecords?: number,                  // max records fetched per request page; UI-configurable
    proxy?: string,                       // HTTP proxy URL for outbound requests; backend-only (global config)
    showCompleteSummaryInfo?: boolean,    // if true, log includes full harvest detail instead of summary; backend-only
    skipUrlCheckOnHarvest?: boolean,      // if true, skips availability check for distribution URLs; backend-only
    startPosition?: number,               // page offset to start harvesting from (1-based); UI-configurable
    type: string,                         // importer type identifier (e.g. 'CSW', 'WFS'); UI-configurable (set at creation, read-only after)
    whitelistedIds?: string[],            // IDs to always include even if also blacklisted; UI-configurable
    rejectUnauthorizedSSL?: boolean,      // if false, ignores invalid SSL certificates; backend-only (global config)
    rules?: {
        containsDocumentsWithData?: boolean,          // if true, only include records that have at least one downloadable distribution; UI-configurable
        containsDocumentsWithDataBlacklist?: string   // comma-separated file formats to exclude from the data-download check; UI-configurable
    },
    timeout: number,                      // HTTP request timeout in milliseconds; backend-only
    sourceURL: string                     // base URL of the data source to harvest; UI-configurable
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
    startPosition: 1,
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
