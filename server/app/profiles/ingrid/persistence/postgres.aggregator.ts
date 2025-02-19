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

import { EsOperation } from '../../../persistence/elastic.utils';
import { PostgresAggregator as AbstractPostgresAggregator } from '../../../persistence/postgres.aggregator';
import { Bucket } from '../../../persistence/postgres.utils';
import { createEsId } from '../ingrid.utils';
import { IngridIndexDocument } from '../model/index.document';

export class PostgresAggregator implements AbstractPostgresAggregator<IngridIndexDocument> {

    public async processBucket(bucket: Bucket<IngridIndexDocument>): Promise<EsOperation[]> {
        let box: EsOperation[] = [];
        // find primary document
        let { document, duplicates } = this.prioritizeAndFilter(bucket);

        for (let [id, service] of bucket.operatingServices) {
            document = this.resolveCoupling(document, service);
        }

        // shortcut - if all documents in the bucket should be deleted, delete the document from ES
        let deleteDocument = document.extras.metadata.deleted != null;
        bucket.duplicates.forEach(duplicate => deleteDocument &&= duplicate.extras.metadata.deleted != null);
        if (deleteDocument) {
            return [{ operation: 'delete', _index: document['catalog'].identifier, _id: createEsId(document) }];
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
                box.push({ operation: 'delete', _index: document['catalog'].identifier, _id: old_id });
            }
            // remove data with duplicate _id if it differs from the newly created id
            if (duplicate_id != document_id) {
                box.push({ operation: 'delete', _index: document['catalog'].identifier, _id: duplicate_id });
            }
        }
        document = this.sanitize(document);
        // document = MiscUtils.merge(document, { extras: { transformed_data: { dcat_ap_plu: DcatApPluDocumentFactory.create(document) } } });
        box.push({ operation: 'index', _index: document['catalog'].identifier, _id: createEsId(document), document });
        return box;
    }

    private prioritizeAndFilter(bucket: Bucket<IngridIndexDocument>): {
        document: IngridIndexDocument,
        duplicates: Map<string | number, IngridIndexDocument>
    } {
        let mainDocument: IngridIndexDocument;
        let duplicates: Map<string | number, IngridIndexDocument> = new Map<string | number, IngridIndexDocument>();

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

    /**
     * Deduplicate datasets across the whole database. For a given dataset and a given duplicate, merge specified
     * properties of the duplicate into the dataset.
     *
     * @param document
     * @param duplicate
     * @returns the augmented dataset
     */
    private deduplicate(document: IngridIndexDocument, duplicate: IngridIndexDocument): IngridIndexDocument {
        return document;
    }

    private sanitize(document: IngridIndexDocument): IngridIndexDocument {
        return document;
    }

    private resolveCoupling(document: IngridIndexDocument, service: any): IngridIndexDocument {
        if(service && service.hierarchylevel == 'service'){
            if(service.capabilities_url){
                document.capabilities_url ??= [];
                document.capabilities_url.push(service.capabilities_url);
            }
            document.refering ??= { object_reference: [] };
            document.refering.object_reference ??= [];
            document.refering.object_reference.push({
                obj_uuid: service.uuid,
                obj_name: service.title,
                obj_class: "3",
                special_name: "Gekoppelte Daten",
                special_ref: "3600",
                type: service.t011_obj_serv?.type,
                version: service.t011_obj_serv_version?.version_value
            });
            document.refering_service_uuid ??= [];
            document.refering_service_uuid.push(service.uuid+"@@"+service.title+"@@"+service.capabilities_url+"@@"+document.t011_obj_geo.datasource_uuid);
        }
        return document;
    }
}
