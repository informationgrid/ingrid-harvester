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

import { ElasticsearchCatalog } from '../../../catalog/elasticsearch/elasticsearch.catalog.js';
import type { ImporterSettings } from '../../../importer/importer.settings.js';
import type { Bucket, PrioritizedBucket } from '../../../model/bucket.js';
import type { EsOperation } from '../../../persistence/elastic.utils.js';
import { createEsId } from '../lvr.utils.js';
import type { LvrIndexDocument } from '../model/index.document.js';


export class LvrElasticsearchCatalog extends ElasticsearchCatalog {

    async processBucket(bucket: Bucket<LvrIndexDocument>, importerSettings: ImporterSettings): Promise<EsOperation[]> {
        let box: EsOperation[] = [];

        // find primary document
        let { mainDocument, documents } = this.prioritizeAndFilter(bucket);

        // shortcut - if all documents in the bucket should be deleted, delete the document from ES
        let deleteDocument = mainDocument.extras.metadata.deleted != null;
        bucket.documents.forEach(duplicate => deleteDocument &&= duplicate.extras.metadata.deleted != null);
        if (deleteDocument) {
            return [{ operation: 'delete', _id: createEsId(mainDocument) }];
        }

        // deduplication
        for (let [id, duplicate] of documents) {
            let old_id = createEsId(mainDocument);
            let duplicate_id = createEsId(duplicate);
            mainDocument = this.deduplicate(mainDocument, duplicate);
            let document_id = createEsId(mainDocument);
            mainDocument.extras.metadata.merged_from.push(duplicate_id);
            // remove dataset with old_id if it differs from the newly created id
            if (old_id != document_id) {
                box.push({ operation: 'delete', _id: old_id });
            }
            // remove data with duplicate _id if it differs from the newly created id
            if (duplicate_id != document_id) {
                box.push({ operation: 'delete', _id: duplicate_id });
            }
        }

        box.push({ operation: 'index', _id: createEsId(mainDocument), document: mainDocument });
        return box;
    }

    private prioritizeAndFilter(bucket: Bucket<LvrIndexDocument>): PrioritizedBucket<LvrIndexDocument> {
        // initialize records map
        const records: Map<string, Map<string | number, LvrIndexDocument>> = new Map<string, Map<string | number, LvrIndexDocument>>();
        for (const [id, document] of bucket.documents) {
            let sourceType = document.extras.metadata.source.source_type;
            let sourceMap = records.get(sourceType);
            if (sourceMap == null) {
                sourceMap = new Map<string | number, LvrIndexDocument>();
                records.set(sourceType, sourceMap);
            }
            sourceMap.set(id, document);
        }

        let mainDocument: LvrIndexDocument;
        const documents: Map<string | number, LvrIndexDocument> = new Map<string | number, LvrIndexDocument>();

        for (const [id, document] of bucket.documents) {
            if (mainDocument == null) {
                mainDocument = document;
            }
            else {
                documents.set(id, document);
            }
        }

        return { mainDocument, documents };
    }

    private deduplicate(document: LvrIndexDocument, duplicate: LvrIndexDocument): LvrIndexDocument {
        return document;
    }
}
