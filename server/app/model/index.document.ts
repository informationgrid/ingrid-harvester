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
    $schema: string,
    schema_version?: string, // TODO: Will be removed from index schema in future
    metadata: IndexDocumentMetadata,
    title: string,
    sort_uuid?: string,
    description?: string,
    language?: string,
    contacts?: IndexContact[],
    spatials?: IndexSpatial[],
    temporal?: IndexTemporal,
    keywords?: IndexKeyword[],
    references?: IndexReference[],
    fulltext?: string[],
    exports?: { [key: string]: string },
};

export type IndexDocumentMetadata = {
    data_type: string,
    document_type?: string,
    created: string | null,     // ISO 8601
    modified: string | null,    // ISO 8601
    issued?: string | null,     // ISO 8601
    partner?: string,
    provider?: string,
    language?: string,
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
    date_type?: 'created' | 'last_updated' | 'first_published',
} & ({ date: string } | { date_range: { gte?: string, lte?: string } } | { date_text: string });

export type IndexReference = {
    internal?: boolean,
    url?: string,        // required by schema when internal !== true
    uuid_ref?: string,   // required by schema when internal === true
    type?: { key: string | null, value: string | null },
    title?: string,
    explanation?: string,
};

// ---------------------------------------------------------------------------
// Legacy types — kept for non-ingrid profiles (LVR etc.) during migration
// ---------------------------------------------------------------------------

export type GeometryInformation = {
    geometry: Geometry,
    centroid: Point,
    type: string,
    description: string,
    address: string
};
