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

import type { IndexDocument, IndexDocumentMetadata, IndexTemporal } from '../../../model/index.document.js';

export type IngridDocumentType = 'InGridGeoDataset' | 'InGridDataCollection' | 'InGridGeoService'
    | 'InGridInformationSystem' | 'InGridPublication' | 'InGridProject'
    | 'InGridSpecialisedTask';

// ---------------------------------------------------------------------------
// InGrid/ISO document — produced by the CSW/WFS mappers
// ---------------------------------------------------------------------------

export type IngridIndexDocument = IndexDocument & {
    metadata: IndexDocumentMetadata & { data_type: 'INGRID' | 'UMWELTNAVI', document_type?: IngridDocumentType },
} & IngridFields;

export type IngridFields = {
    temporal?: IngridTemporal,
    exports?: { iso?: string },
    ingrid?: IngridSpecific,
    crs?: string[],
};

export type IngridSpecific = {
    alternate_title?: string,
    licenses?: IngridLicense[],
    parent_identifier?: string,
    datasource_identifier?: string,
    spatial_representation?: IngridSpatialRepresentation[],
    specific_usage?: string,
    purpose?: string,
    conformance_result?: IngridConformanceResult[],
    order_info?: string,
    data_quality?: IngridDataQuality,
    character_set?: { key: string | null, value: string | null },
    spatialResolutionScale?: { scale?: number, resolution_ground?: number, resolution_scan?: number },
    cross_references?: {
        uuid?: string,
        name?: string,
        document_type?: string,
        description?: string,
        reference_type?: string,
        direction?: 'IN' | 'OUT',
    }[],
    lineage?: { statement?: string, source?: string, process_step?: string },
    processStepDescription?: string[],
    symbolCatalogue?: { title?: string, date?: string, version?: string }[],
    codeListReference?: { title?: string, date?: string, version?: string }[],
    attributeDescription?: string[],
    spatial?: {
        description?: string,
        vertical_extent?: {
            minimum?: number,
            maximum?: number,
            unit?: { key: string | null, value: string | null },
            vdatum?: { key: string | null, value: string | null },
        },
    },
    service?: {
        type?: string,
        classifications?: string[],
        versions?: string[],
        operations?: { name?: string, description?: string, access_url?: string }[],
        environmentDescription?: string,
        serviceHistory?: string,
        additionalInformation?: string,
        hasAccessConstraints?: boolean,
        doi?: { identifier?: string, generalResourceType?: string, resourceType?: string },
    },
};

export type IngridTemporal = IndexTemporal & {
    status?: { key: string | null, value: string | null },
    maintenance_frequency?: { key: string | null, value: string | null },
    user_defined_maintenance_frequency_in_sec?: string,
};

export type IngridLicense = {
    type?: 'accessConstraints' | 'useConstraints' | 'useLimitations',
    items?: { key: string | null, value: string | null }[],
};

export type IngridConformanceResult = {
    pass?: 'conformant' | 'not-conformant' | 'not-evaluated',
    specification?: { key: string | null, value: string | null },
    publicationDate?: string,
    explanation?: string,
};

export type IngridDataQuality = {
    completenessOmission?: number,
    positionalAccuracy?: {
        horizontal?: number,
        vertical?: number,
    },
    qualities?: {
        type?: 'completenessComission' | 'conceptualConsistency' | 'domainConsistency'
             | 'formatConsistency' | 'topologicalConsistency' | 'temporalConsistency'
             | 'thematicClassificationCorrectness' | 'nonQuantitativeAttributeAccuracy'
             | 'quantitativeAttributeAccuracy' | 'relativeInternalPositionalAccuracy',
        measure_type?: { key: string | null, value: string | null },
        value?: number,
        parameter?: string,
    }[],
};

export type IngridSpatialRepresentation = {
    type?: 'text' | 'vector' | 'tin' | 'video' | 'stereomodel' | 'grid',
    vector?: {
        topology?: string,
        geometry_type?: string,
        number?: number,
    }[],
    grid?: {
        axes?: { label?: string, number?: number, resolution?: number }[],
        available_parameters?: boolean,
        number_dimensions?: number,
        cell_geometry?: { key: string | null, value: string | null },
        rectified?: {
            checkPointAvailability?: boolean,
            checkPointDescription?: string,
            cornerPoints?: string,
            pointInPixel?: { key: string | null, value: string | null },
        },
        referenced?: {
            orientationParameterAvailability?: boolean,
            controlPointAvaliability?: boolean,
            parameters?: string,
        },
    },
};
