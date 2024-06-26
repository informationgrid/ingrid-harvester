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

export type IndexDocument = {
    extras: {
        metadata: HarvestingMetadata
    }
}

export type HarvestingMetadata = {
    harvested?: Date,
    harvesting_errors?: string[],   // get errors after all operations been done
    issued: Date,
    is_changed?: boolean,   // has been changed from its original version by the hravesting process
    is_valid?: boolean,     // checks validity after all operations been done
    modified: Date,
    quality_notes?: string[],
    source: MetadataSource,
    merged_from: string[],
    deleted?: Date
}

export type MetadataSource = {
    source_base: string,
    source_type: string,
    raw_data_source?: string,
    portal_link?: string,
    attribution?: string
}
