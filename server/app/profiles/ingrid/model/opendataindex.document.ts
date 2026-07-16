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

import type { IndexDocument, IndexDocumentMetadata } from '../../../model/index.document.js';
import type { IngridDocumentType } from './index.document.js';

// ---------------------------------------------------------------------------
// OpenData/DCAT document — produced by the CKAN/DCAT-AP.de/Genesis mappers
// ---------------------------------------------------------------------------

export type IngridOpendataIndexDocument = IndexDocument & {
    metadata: IndexDocumentMetadata & { data_type: string, document_type?: IngridDocumentType },
} & IngridOpendataFields;

export type IngridOpendataFields = {
    exports?: { rdf?: string },
    dcat?: { landing_page?: string },
    legal_basis?: string,
    distributions?: IngridOpendataDistribution[],
    political_geocoding_level_uri?: string,
    // legacy IDF fields, not part of index-opendata.json, kept for IDF export / catalog display
    uuid?: string,
    collection?: { name: string },
    t01_object?: any,
    modified?: Date,
    sort_hash?: string,
};

export type IngridOpendataDistribution = {
    format?: string,
    access_url?: string,
    modified?: string,
    title?: string,
    description?: string,
    license?: {
        url?: string,
        name?: string,
        attribution_by_text?: string,
        languages?: string[],
    },
    availability?: string,
};
