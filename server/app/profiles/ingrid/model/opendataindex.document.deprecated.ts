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

import type { HarvestingMetadata } from './index.document.deprecated.js';
import type { IngridMetadata } from './ingrid.metadata.js';

// the pre-migration ("opendata") document shape, still produced today by ckan/genesis/dcatapde's own
// createIndexDocument() on the (unmigrated) main branch. Reintroduced as the 'opendata-deprecated'
// document kind - see ingridCkanMapper/ingridGenesisMapper/ingridDcatapdeMapper's own
// buildOpendataDeprecatedDocument(). Deliberately standalone, same reasoning as
// IngridDeprecatedIndexDocument in index.document.deprecated.ts.
export type IngridOpendataDeprecatedIndexDocument = IngridMetadata & {
    metadata: {
        created: Date | null,
        modified: Date,
    },
    id: string,
    uuid: string,
    collection: {
        name: string
    },
    extras: {
        metadata: HarvestingMetadata,
    },
    t01_object: any,
    title: string,
    content: string[],
    rdf: string,
    modified: Date,
    description: string,
    dcat: {
        landingPage: string
    },
    contacts: any[],
    keywords: any[],
    legal_basis: string,
    distributions: any[],
    political_geocoding_level_uri: string,
    spatial: any,
    temporal: {
        accrual_periodicity: string,
        accrual_periodicity_key: string,
    },
    sort_hash: string,
};
