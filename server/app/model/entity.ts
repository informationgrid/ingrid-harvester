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

import type { Distribution } from './distribution.js';
import type { IndexDocument } from './index.document.js';

export interface Entity {
    id?: string     // optional because it is usually set by the DB automatically at the time of insertion
}

export interface RecordEntity extends Entity {
    identifier: string,
    source: string,
    collection_id: number,
    dataset: IndexDocument, // TODO rename to dataset_elastic, make optional
    dataset_csw?: any,
    dataset_dcat?: any,
    original_document: string
}

// TODO revise coupling handling
export interface CouplingEntity extends Entity {
    dataset_identifier: string,
    service_id: string,
    service_type: string,
    distribution: Distribution
}
