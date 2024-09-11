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

import { DateRange } from '../../../model/dateRange';
import { Geometries } from '@turf/helpers';

export interface Actor {
    displayName?: string,
    id: string,
    name: string,
    role?: Concept,
    type?: string
}

export interface Concept {
    id: string,
    term: string
}

export interface Description {
    noteId: string,
    source: string
}

export interface Event {
    actor: Actor,
    description: Description,
    displayDate: string,
    period: DateRange,
    place: Place,
    type: Concept
}

export interface Info {
    created: Date,
    link: string,
    modified: Date,
    type: string    // 'lido record' | 'source record'
}

export interface Link {
    format: string,
    url: string
}

export interface Place {
    displayPlace: string,
    geometry: Geometries,
    id: string,
    name: string
}

export interface Record {
    ids: LidoId[],
    info: Info[],
    rights: Right[],
    sources: Source[],
    type: string
}

export interface LidoId {
    id: string,
    source: string,
    type: string
}

export interface Relation {
    description: string,
    id: string,
    relationType: {
        id: string,
        term: string
    },
    type: string
}

export interface Repository {
    id: string,
    name: string,
    place: Place,
    workId: string
}

export interface Resource {
    description: string,
    // descriptionType: string,
    id: string,
    rights: Right[],
    source: Source,
    type: string
}

export interface Right {
    holder: string,
    licenseName: string,
    licenseURL: string
}

export interface Source {
    name: string,
    type?: string,
    url?: string
}

export interface Subject {
    actor: Actor,
    displayDate: string,
    period: DateRange,
    place: Place,
    keyword: Keyword
}

export interface Keyword {
    conceptIds: LidoId[],
    terms: string[]
}
