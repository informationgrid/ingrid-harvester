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

import type { IndexDocument } from '../../../model/index.document.js';
import type { Bucket, BucketDocument } from '../../../persistence/postgres.utils.js';
import type { IngridIndexDocument } from '../model/index.document.js';

// Bucket processing helpers shared by the ingrid catalogs that receive whole index documents
// (IngridElasticsearchCatalog, IngridDirectusCatalog).

// checks both the new shape's field (document.metadata.datasource.type) and the deprecated shape's
// (document.extras.metadata.source.source_type, the same field main's own isCsw/isWfs still read) -
// exactly one of the two is ever populated, depending on which shape this catalog's mapping produces.
export function isCsw(entry: BucketDocument<IndexDocument>): boolean {
    const document = entry.document as any;
    return document.metadata?.datasource?.type === 'csw' || document.extras?.metadata?.source?.source_type === 'csw';
}

export function isWfs(entry: BucketDocument<IndexDocument>): boolean {
    const document = entry.document as any;
    return document.metadata?.datasource?.type === 'wfs' || document.extras?.metadata?.source?.source_type === 'wfs';
}

// true only for IngridDeprecatedIndexDocument (the old flat "ingrid" shape) - the only ingrid-family
// document shape with a `uuid` but no `id`. opendata-deprecated documents never reach the call sites
// that use this (isCsw()/isWfs() are always false for CKAN/DCAT-AP.de/Genesis-sourced documents).
export function isDeprecatedIngridShape(document: any): boolean {
    return 'uuid' in document && !('id' in document);
}

// the bucket query (getBuckets.sql, a UNION ordered only by anchor_id) returns a bucket's coupled
// records in arbitrary order - sorting them by document id (deprecated shape: uuid) keeps the
// references/cross_references that resolveCoupling() appends stable across harvest runs
export function sortByDocumentId(documents: Iterable<any>): any[] {
    const documentId = (document: any): string => String(document?.id ?? document?.uuid ?? '');
    return [...documents].sort((a, b) => {
        const idA = documentId(a), idB = documentId(b);
        return idA < idB ? -1 : idA > idB ? 1 : 0;
    });
}

export function prioritizeAndFilter(bucket: Bucket<IndexDocument>): {
    entry: BucketDocument<IndexDocument>,
    duplicates: Map<string | number, BucketDocument<IndexDocument>>
} {
    let mainEntry: BucketDocument<IndexDocument>;
    let duplicates: Map<string | number, BucketDocument<IndexDocument>> = new Map<string | number, BucketDocument<IndexDocument>>();

    // Special case for WFS: if bucket contains ONLY WFS documents and there is a feature type document,
    // it should be the main document.
    let allWfs = true;
    let featureTypeDocId: string | number = null;

    for (let [id, entry] of bucket.duplicates) {
        if (!isWfs(entry)) {
            allWfs = false;
        }
        if ((entry.document as any).is_feature_type === true) {
            featureTypeDocId = id;
        }
    }

    if (allWfs && featureTypeDocId !== null) {
        mainEntry = bucket.duplicates.get(featureTypeDocId);
        for (let [id, entry] of bucket.duplicates) {
            if (id !== featureTypeDocId) {
                duplicates.set(id, entry);
            }
        }
    }
    else {
        for (let [id, entry] of bucket.duplicates) {
            if (mainEntry == null) {
                mainEntry = entry;
            }
            else {
                duplicates.set(id, entry);
            }
        }
    }

    return { entry: mainEntry, duplicates };
}

export function resolveCoupling(document: IngridIndexDocument, additionalDoc: any) {
    if (!additionalDoc) {
        return;
    }
    if (additionalDoc.references?.length) {
        document.references ??= [];
        document.references.push(...additionalDoc.references);
    }
    // additionalDoc is another already-mapped IngridIndexDocument from the same coupling
    // (service<->dataset), resolved via the `coupling` table / getBuckets.sql join - only
    // there (not in a per-record mapper) are both sides of the relationship available at once
    const additionalDocIsService = additionalDoc.ingrid?.document_type === 'InGridGeoService';
    const crossReference = {
        uuid: additionalDoc.id,
        name: additionalDoc.title,
        document_type: additionalDoc.ingrid?.document_type,
        description: additionalDoc.description,
        // matches the old codelist-2000 labels: 3600 "Gekoppelte Daten" when the coupled
        // record is the service (viewed from the dataset), 3345 "Basisdaten" when it's the
        // dataset (viewed from the service) - see codelist_2000.xml
        reference_type: additionalDocIsService ? 'Gekoppelte Daten' : 'Basisdaten',
        direction: additionalDocIsService ? 'IN' as const : 'OUT' as const,
    };
    document.ingrid.cross_references ??= [];
    // a service already carries a uuid-only entry per coupled dataset (written by the CSW mapper
    // from srv:operatesOn) - complete it instead of adding a duplicate
    const existing = document.ingrid.cross_references.find(ref => ref.uuid === crossReference.uuid);
    if (existing) {
        Object.assign(existing, crossReference);
    }
    else {
        document.ingrid.cross_references.push(crossReference);
    }
}

export function createIdfForWfs(document: IngridIndexDocument, duplicates: Map<string | number, BucketDocument<IndexDocument>>) {
    // create idf
    let features = [];
    for (let [id, entry] of duplicates) {
        let featureDocument = entry.document as IngridIndexDocument;
        if ((featureDocument as any).is_feature_type === false) {
            features.push(featureDocument.exports.iso);
        }
    }
    document.idf = document?.idf?.replace('<h2>Features:</h2>', '<h2>Features:</h2>\n' + features.join('\n'));
}
