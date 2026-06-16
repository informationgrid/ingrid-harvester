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

import type { Geometry, Point } from 'geojson';

// ---------------------------------------------------------------------------
// Schema-aligned base document (shared root section across all profile schemas)
// ---------------------------------------------------------------------------

export type IndexDocument = {
    id: string,
    schema_version: string, // TODO: align with app release version
    metadata: IndexDocumentMetadata,
    title: string,
    sort_uuid?: string,
    description?: string,
    language?: string,
    contacts?: IndexContact[],
    spatials?: IndexSpatial[],
    temporal?: IndexTemporal,
    keywords?: IndexKeyword[],
    fulltext?: string[],
    exports?: { [key: string]: string },

    // TODO cleanup: we should not need extras.metadata
    extras?: {
        metadata: HarvestingMetadata
    },
};

export type IndexDocumentMetadata = {
    data_type: string,
    created: string | null,     // ISO 8601
    modified: string | null,    // ISO 8601
    issued?: string | null,     // ISO 8601
    partner?: string,
    provider?: string,
    language?: { key: string | null, value: string | null },
    datasource?: { id: string, name: string },
};

export type IndexContact = {
    role?: string,
    name?: string,
    communications?: { type: 'email' | 'phone' | 'fax' | 'website' | 'social' | 'other', value: string }[],
    street?: string,
    code?: string,
    pocode?: string,
    pobox?: string,
    locality?: string,
    country?: string,
    administrative_area?: string,
};

export type IndexSpatial = {
    name?: string,
    geometry?: Geometry,
    bbox?: number[],
    wkt?: string,
    toponym?: string[],
    administrative?: { state?: string[], regional_key?: string },
};

export type IndexKeyword = {
    term: string,
    source: string,
    id?: string,
};

export type IndexTemporal = {
    data_temporal?: IndexTemporalItem[],
};

export type IndexTemporalItem = {
    date_type: 'created' | 'last_updated' | 'first_published',
} & ({ date: string } | { date_range: { start?: string, end?: string } } | { date_text: string });

// ---------------------------------------------------------------------------
// Legacy types — kept for non-ingrid profiles (LVR etc.) during migration
// ---------------------------------------------------------------------------

export type HarvestingMetadata = {
    harvested?: Date,
    harvesting_errors?: string[],   // get errors after all operations been done
    issued: Date,
    is_changed?: boolean,   // has been changed from its original version by the harvesting process
    is_valid?: boolean,     // checks validity after all operations been done
    modified: Date,
    quality_notes?: string[],
    source: MetadataSource,
    merged_from: string[],
    deleted?: Date
};

export type MetadataSource = {
    source_base: string,
    source_type: string,
    raw_data_source?: string,
    portal_link?: string,
    attribution?: string
};

export type GeometryInformation = {
    geometry: Geometry,
    centroid: Point,
    type: string,
    description: string,
    address: string
};
