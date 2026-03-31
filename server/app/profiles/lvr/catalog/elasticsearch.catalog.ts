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
import type { ImporterSettings } from '../../../importer.settings.js';
import type { EsOperation } from '../../../persistence/elastic.utils.js';
import type { Bucket } from '../../../persistence/postgres.utils.js';
import { createEsId } from '../lvr.utils.js';
import type { LvrIndexDocument } from '../model/index.document.js';


export class LvrElasticsearchCatalog extends ElasticsearchCatalog {

    async processBucket(bucket: Bucket<LvrIndexDocument>, importerSettings: ImporterSettings): Promise<EsOperation[]> {
        let box: EsOperation[] = [];

        // find primary document
        let { document, duplicates } = this.prioritizeAndFilter(bucket);

        // shortcut - if all documents in the bucket should be deleted, delete the document from ES
        let deleteDocument = document.extras.metadata.deleted != null;
        bucket.duplicates.forEach(duplicate => deleteDocument &&= duplicate.extras.metadata.deleted != null);
        if (deleteDocument) {
            return [{ operation: 'delete', _id: createEsId(document) }];
        }

        // deduplication
        for (let [id, duplicate] of duplicates) {
            let old_id = createEsId(document);
            let duplicate_id = createEsId(duplicate);
            document = this.deduplicate(document, duplicate);
            let document_id = createEsId(document);
            document.extras.metadata.merged_from.push(duplicate_id);
            // remove dataset with old_id if it differs from the newly created id
            if (old_id != document_id) {
                box.push({ operation: 'delete', _id: old_id });
            }
            // remove data with duplicate _id if it differs from the newly created id
            if (duplicate_id != document_id) {
                box.push({ operation: 'delete', _id: duplicate_id });
            }
        }

        box.push({ operation: 'index', _id: createEsId(document), document });
        return box;
    }

    private prioritizeAndFilter(bucket: Bucket<LvrIndexDocument>): { 
        document: LvrIndexDocument, 
        duplicates: Map<string | number, LvrIndexDocument>
    } {
        // initialize records map
        let records: Map<string, Map<string | number, LvrIndexDocument>> = new Map<string, Map<string | number, LvrIndexDocument>>();
        for (let [id, document] of bucket.duplicates) {
            let sourceType = document.extras.metadata.source.source_type;
            let sourceMap = records.get(sourceType);
            if (sourceMap == null) {
                sourceMap = new Map<string | number, LvrIndexDocument>();
                records.set(sourceType, sourceMap);
            }
            sourceMap.set(id, document);
        }

        let mainDocument: LvrIndexDocument;
        let duplicates: Map<string | number, LvrIndexDocument> = new Map<string | number, LvrIndexDocument>();

        for (let [id, document] of bucket.duplicates) {
            if (mainDocument == null) {
                mainDocument = document;
            }
            else {
                duplicates.set(id, document);
            }
        }

        return { document: mainDocument, duplicates };
    }

    private deduplicate(document: LvrIndexDocument, duplicate: LvrIndexDocument): LvrIndexDocument {
        return document;
    }
}
