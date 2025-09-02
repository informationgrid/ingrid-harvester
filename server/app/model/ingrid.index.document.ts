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

import { DateRange } from './dateRange.js';
import { Geometries, Geometry, GeometryCollection, Point } from '@turf/helpers';

export type IngridIndexDocument = {
    id: string,
    schema_version: string,
    title: string,
    description?: string,
    spatial?: Spatial,
    temporal: {
        modified: Date,
        issued: Date,
        data_temporal?: {
            date_range: DateRange,
            date_type?: string
        }
    },
    keywords?: Keyword[],
    fulltext: string,
    sort_uuid: string,
    metadata: Metadata
};

export type Spatial = {
    geometry?: Geometries | GeometryCollection,
    bbox?: Geometry,
    centroid?: Point,
    inside_point?: Point,
    location_points?: Point,
    outline?: Geometries | GeometryCollection,
    title?: string
};

export type Keyword = {
    term: string,
    id?: string,
    source?: string
}

export type Metadata = {
    issued: Date,
    modified: Date,
    source: {

    }
};
