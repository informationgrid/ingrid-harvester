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

import log4js from 'log4js';
import { DirectusCatalog, type DirectusOperation } from '../../../catalog/directus/directus.catalog.js';
import type { ImporterSettings } from '../../../importer/importer.settings.js';
import type { IndexDocument } from '../../../model/index.document.js';
import type { Bucket } from '../../../persistence/postgres.utils.js';
import { ProfileFactoryLoader } from '../../profile.factory.loader.js';
import { createEsId } from '../ingrid.utils.js';
import type { IngridIndexDocument } from '../model/index.document.js';
import { createIdfForWfs, isCsw, isDeprecatedIngridShape, isWfs, prioritizeAndFilter, resolveCoupling, sortByDocumentId } from './ingrid.bucket.utils.js';

const log = log4js.getLogger(import.meta.filename);

/**
 * Pushes the ingrid index documents (new index format only) to the UmweltNAVI Ingest API.
 * The bucket processing is the same as in IngridElasticsearchCatalog, without the InGrid-wide deduplication
 * against external indices and without the `ingrid_meta` entry.
 */
export class IngridDirectusCatalog extends DirectusCatalog {

    protected getBucketQuery(importerSettings: ImporterSettings): string {
        if (importerSettings['wfsProfile'] == 'zdm') {
            return ProfileFactoryLoader.get().getPostgresQueries().getModifiedBuckets('zdm');
        }
        return super.getBucketQuery(importerSettings);
    }

    async processBucket(bucket: Bucket<IndexDocument>, importerSettings: ImporterSettings): Promise<DirectusOperation[]> {
        const box: DirectusOperation[] = [];
        // find primary document
        const { entry, duplicates } = prioritizeAndFilter(bucket);
        if (!entry?.document) {
            return null;
        }
        const document = entry.document as IngridIndexDocument;

        // the deprecated index formats are not supported by the Ingest API
        if (isDeprecatedIngridShape(document)) {
            const msg = `Document ${createEsId(document)} has a deprecated index format and is not sent to Directus catalog '${this.settings.id}'`;
            log.error(msg);
            this.summary.errors.push({ type: 'app', error: msg });
            this.summary.numErrors++;
            return null;
        }

        // resolve CSW coupling
        if (isCsw(entry)) {
            for (const service of sortByDocumentId(bucket.operatingServices.values())) {
                resolveCoupling(document, service);
            }
        }

        // shortcut - if all documents in the bucket should be deleted, delete the document
        let deleteDocument = entry.deleted != null;
        bucket.duplicates.forEach(duplicate => deleteDocument &&= duplicate.deleted != null);
        if (deleteDocument) {
            return [{ operation: 'delete', record: { id: createEsId(document) } }];
        }

        // harvester deduplication: remove duplicates stored under a different id
        const documentId = createEsId(document);
        for (const [, duplicate] of duplicates) {
            const duplicateId = createEsId(duplicate.document);
            if (duplicateId != documentId) {
                box.push({ operation: 'delete', record: { id: duplicateId } });
            }
        }

        // handle WFS
        if (isWfs(entry)) {
            createIdfForWfs(document, duplicates);
        }

        box.push({ operation: 'upsert', record: { ...document, id: documentId } });
        return box;
    }
}
