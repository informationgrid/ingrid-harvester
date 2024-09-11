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

import { createEsId } from '../lvr.utils';
import { Bucket } from '../../../persistence/postgres.utils';
import { EsOperation } from '../../../persistence/elastic.utils';
import { LvrIndexDocument } from '../model/index.document';
import { PostgresAggregator as AbstractPostgresAggregator } from '../../../persistence/postgres.aggregator';

export class PostgresAggregator implements AbstractPostgresAggregator<LvrIndexDocument> {

    public async processBucket(bucket: Bucket<LvrIndexDocument>): Promise<EsOperation[]> {
        let box: EsOperation[] = [];
        // find primary document
        let { document, duplicates } = this.prioritizeAndFilter(bucket);

        // shortcut - if all documents in the bucket should be deleted, delete the document from ES
        let deleteDocument = document.extras.metadata.deleted != null;
        bucket.duplicates.forEach(duplicate => deleteDocument &&= duplicate.extras.metadata.deleted != null);
        if (deleteDocument) {
            return [{ operation: 'delete', _id: createEsId(document) }];
        }

        // // merge service information into dataset
        // for (let [id, service] of bucket.operatingServices) {
        //     document = this.resolveCoupling(document, service);
        // }
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
        document = this.sanitize(document);
        // document = MiscUtils.merge(document, { extras: { transformed_data: { dcat_ap_plu: DcatApPluDocumentFactory.create(document) } } });
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

    // /**
    //  * Resolve data-service coupling. For a given dataset and a given service, merge the service's distributions into
    //  * the dataset's. Exception: if the service is a WFS, additionally overwrite the `spatial` field.
    //  * 
    //  * @param document the dataset whose distributions should be extended
    //  * @param service the service distribution that should be merged into the dataset
    //  * @returns the augmented dataset
    //  */
    // private resolveCoupling(document: LvrIndexDocument, service: Distribution): LvrIndexDocument {
    //     return document;
    // }

    /**
     * Deduplicate datasets across the whole database. For a given dataset and a given duplicate, merge specified
     * properties of the duplicate into the dataset.
     * 
     * @param document 
     * @param duplicate 
     * @returns the augmented dataset
     */
    private deduplicate(document: LvrIndexDocument, duplicate: LvrIndexDocument): LvrIndexDocument {
        // log.warn(`Merging ${duplicate.identifier} (${duplicate.extras.metadata.source.source_base}) into ${document.identifier} (${document.extras.metadata.source.source_base})`);
        // switch (document.extras.metadata.source.source_type) {
        //     case 'cockpitpro':
        //         return document;
        //     case 'cockpit':
        //         if (duplicate.extras.metadata.source.source_type == 'beteiligungsdb') {
        //             return { ...document, process_steps: duplicate.process_steps };
        //         }
        //         else {
        //             return document;
        //         }
        //     case 'beteiligungsdb':
        //         return document;
        //     case 'csw':
        //         let updatedFields = {};
        //         for (const field of overwriteFields) {
        //             updatedFields[field] = duplicate[field];
        //         }
        //         // use publisher from WFS if not specified in CSW
        //         if (!document.publisher?.['name'] && !document.publisher?.['organization']) {
        //             updatedFields['publisher'] = duplicate.publisher;
        //         }
        //         let updatedDocument = { ...document, ...updatedFields };
        //         // TODO remove or perpetuate : hack for stage/prod
        //         // only set the CSW document to valid, if it has a WFS duplicate that is also valid
        //         // default for CSW has been set to false in `diplanung.csw.mapper`
        //         if (HACK_ON) {
        //             if (duplicate.extras.metadata.source.source_base.toLowerCase().includes("wfs")) {
        //                 updatedDocument.extras.metadata.is_valid = duplicate.extras.metadata.is_valid;
        //             }
        //         }
        //         return updatedDocument;
            // default:
                return document;
        // }
        // TODO don't we need a proper merge?
        // return MiscUtils.merge(document, updatedFields);
    }

    private sanitize(document: LvrIndexDocument): LvrIndexDocument {
        return document;
    }
}
