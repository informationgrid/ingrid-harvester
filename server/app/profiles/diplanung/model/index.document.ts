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

import type { Catalog, PluPlanState, PluPlanType, PluProcedureState, PluProcedureType, ProcessStep } from '../../../model/dcatApPlu.model.js';
import type { DateRange } from '../../../model/dateRange.js';
import type { Distribution } from '../../../model/distribution.js';
import type { Agent } from '../../../model/agent.js';
import type { MetadataSource } from '../../../importer/mapper.js';

export type DiplanungIndexDocument = {
    uuid: string,
    // mandatory
    contact_point: {
        fn: string,
        has_country_name?: string,
        has_locality?: string,
        has_postal_code?: string,
        has_region?: string,
        has_street_address?: string,
        has_email?: string,
        has_telephone?: string,
        has_uid?: string,
        has_url?: string,
        has_organization_name?: string
    },
    description: string,
    identifier: string,
    title: string,
    plan_state: PluPlanState,
    procedure_state: PluProcedureState,
    publisher: Agent,
    // recommended
    adms_identifier: string,
    plan_name: string,
    plan_type: PluPlanType,
    plan_type_fine: string,
    procedure_period: DateRange,
    procedure_type: PluProcedureType,
    distributions: Distribution[],
    process_steps: ProcessStep[],
    bounding_box: any,
    spatial: any,
    // optional
    issued: Date,
    modified: Date,
    extras?: {
        hierarchy_level?: string,   // ISO 19139 codelist value (e.g. 'dataset', 'series', 'service'); only set for CSW-sourced records
        metadata?: {
            harvested?: Date,
            harvesting_errors?: string[],   // get errors after all operations been done
            issued?: Date,
            is_valid?: boolean,     // checks validity after all operations been done
            modified?: Date,
            source?: MetadataSource,
            merged_from?: string[],
            is_changed?: boolean,   // has been changed from its original version by the harvesting process
            quality_notes?: string[],
        },
    },
    relation: string,
    notification: string,
    procedure_import_date: Date,
    development_freeze_period: DateRange,
    maintainers: Agent[],
    contributors: Agent[],
    centroid: any,
    spatial_text: string,
    // additional information and metadata
    catalog: Catalog,
};
