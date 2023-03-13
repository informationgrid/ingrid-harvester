/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or – as soon they will be
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

export interface CronData {
    pattern: string;
    active: boolean;
}

export type ImporterSettings = {
    index: string,
    priority?: number,
    blacklistedIds?: string[],
    cron?: {
        full: CronData,
        incr: CronData
    },
    customCode?: string,
    dateSourceFormats?: string[],
    defaultAttribution?: string,
    defaultAttributionLink?: string,
    defaultDCATCategory?: string[],
    defaultMcloudSubgroup?: string[],
    description?: string,
    disable?: boolean,
    dryRun?: boolean,
    id?: number,
    // TODO ED:2022-10-04: the next entry needs to be transient, i.e. not saved into config file but (requested and) given with every run
    isIncremental: boolean,
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
    }
}
