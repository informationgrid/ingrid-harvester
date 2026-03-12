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

import type { Agent, Contact, Organization, Person } from '../../../model/agent.js';
import type { DateRange } from '../../../model/dateRange.js';
import type { Distribution } from '../../../model/distribution.js';
import type { IndexDocument, MetadataSource } from '../../../model/index.document.js';
import type { License } from '@shared/license.model.js';

export type mcloudIndexDocument = IndexDocument & {
    priority: number,
    completion: string[],
    access_rights: string[],
    accrual_periodicity: string,
    contact_point: Contact,
    creator: Agent | Agent[],
    description: string,
    distribution: Distribution[],
    extras: {
        all: any[],
        citation: string,
        display_contact: Organization[] | Person[],
        generated_id: string,
        groups: string[],
        harvested_data: string,
        license: License,
        metadata: {
            harvested: Date,
            harvesting_errors: null, // get errors after all operations been done
            issued: null,
            is_valid: null, // checks validity after all operations been done
            modified: null,
            source: MetadataSource
        },
        mfund_fkz: string,
        mfund_project_title: string,
        realtime: boolean,
        subgroups: any,
        subsection: any[],
        spatial: any,
        spatial_text: string,
        temporal: DateRange[],
        parent: string,
        hierarchy_level: any,    // csw only
        operates_on: any         // csw only
    },
    issued: Date,
    keywords: string[],
    modified: Date,
    publisher: Organization[] | Person[],
    originator: Agent[],
    theme: string[],
    title: string
}
