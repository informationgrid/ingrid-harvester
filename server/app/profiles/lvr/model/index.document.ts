/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
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

import { DateRange } from '../../../model/dateRange';
import { Geometries, GeometryCollection, Point } from '@turf/helpers';
import { IndexDocument } from '../../../model/index.document';
import { License } from '@shared/license.model';

export type LvrIndexDocument = IndexDocument & {
    identifier: string,
    title: string,
    description: string,
    spatial: GeometryInformation[],
    temporal: DateRange,
    keywords: Keyword[],
    relation: Relation[],
    media: Media[],
    license: License,
    vector: object,
    extras: {
        metadata: {
    //         harvested: Date,
    //         harvesting_errors: null, // get errors after all operations been done
            issued: Date,
    //         is_changed?: boolean,
    //         is_valid: boolean, // checks validity after all operations been done
            modified: Date,
    //         quality_notes?: string[],
            source: {
                source_base: string,
                source_type?: string,
                raw_data_source?: string,
    //             portal_link?: string,
    //             attribution?: string
            }
        }
    },
    // keywords: string[]
};

export type GeometryInformation = {
    geometry: Geometries | GeometryCollection,
    centroid: Point,
    type: string,
    description: string,
    address: string
};

export type Keyword = {
    id: string,
    term: string,
    thesaurus: string
}

export type Media = {
    type: string,
    url: string,
    description: string
}

export type Relation = {
    id: string,
    type: string,
    score: number
}
