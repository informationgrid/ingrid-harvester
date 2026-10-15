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
import type { Observer } from 'rxjs';
import { ElasticsearchCatalog } from '../../../catalog/elasticsearch/elasticsearch.catalog.js';
import type { ImporterSettings } from '../../../importer/importer.settings.js';
import type { ImportLogMessage } from '../../../model/import.result.js';
import type { EsOperation } from '../../../persistence/elastic.utils.js';
import type { Bucket } from '../../../persistence/postgres.utils.js';
import { createEsId } from '../lvr.utils.js';
import type { LvrIndexDocument, Source } from '../model/index.document.js';

const log = log4js.getLogger(import.meta.filename);

const SOURCE_STALENESS_THRESHOLD_DAYS = parseInt(process.env.SOURCE_STALENESS_THRESHOLD_DAYS ?? '1');


export class LvrElasticsearchCatalog extends ElasticsearchCatalog {

    private existingSources: Map<string, Source> = new Map();

    async prepareImport(transactionHandle: any, importerSettings: ImporterSettings, observer: Observer<ImportLogMessage>): Promise<void> {
        await super.prepareImport(transactionHandle, importerSettings, observer);

        // fetch all existing documents' source info in one scroll
        const generator = this.elastic.scroll<LvrIndexDocument>(this.settings.settings.index, ['lvr.source']);

        for await (const doc of generator) {
            if (doc.lvr?.source) {
                this.existingSources.set(doc.id, doc.lvr.source);
            }
        }
    }

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

        const esId = createEsId(document);

        // special checks if source.display_url is empty: keep/update document or delete it?
        if (!document.lvr.source?.display_url) {
            const existing = this.existingSources.get(esId);

            // if document does not already exist, don't create it
            if (!existing) {
                return box;
            }

            const isStale = !existing.last_available || (Date.now() - existing.last_available.getTime()) 
                    > SOURCE_STALENESS_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
            // if the source is stale (no sufficiently current URL available), delete the document
            const lastAvailableStr = existing.last_available?.toISOString() ?? 'never';
            if (isStale) {
                log.warn(`Deleting document ${esId} due to stale source (last URL availability: ${lastAvailableStr})`);
                box.push({ operation: 'delete', _id: esId });
                return box;
            }
            // otherwise use last available source information
            else {
                log.warn(`Source URL was not accessible for document ${esId}, reusing existing source (last URL availability: ${lastAvailableStr})`);
                document.lvr.source = existing;
            }
        }
        else {
            // if the source exists: reset last_available to now
            document.lvr.source.last_available = new Date();
        }

        box.push({ operation: 'index', _id: esId, document });
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
