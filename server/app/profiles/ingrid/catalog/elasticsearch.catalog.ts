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
import type { IndexDocument } from '../../../model/index.document.js';
import { ElasticsearchFactory } from '../../../persistence/elastic.factory.js';
import type { EsOperation } from '../../../persistence/elastic.utils.js';
import type { Bucket } from '../../../persistence/postgres.utils.js';
import { ConfigService } from '../../../services/config/ConfigService.js';
import { camelize, escapeXml } from '../../../utils/misc.utils.js';
import { createEsId } from '../ingrid.utils.js';
import type { IngridIndexDocument } from '../model/index.document.js';
import { APPLICATION_NAME, INGRID_META_INDEX } from '../profile.factory.js';

const log = log4js.getLogger(import.meta.filename);

export class IngridElasticsearchCatalog extends ElasticsearchCatalog {

    // private deduplicationMetadata: Map<string, DeduplicationMetadata>;
    private externalUuids: Set<string>;

    /**
     * This ElasticUtils instance connects to the Elasticsearch cluster configured for the InGrid-wide metadata index,
     * instead of the catalog-specific cluster used by the main ElasticUtils instance of this class (`this.elastic`).
     * This is necessary to gather the existing dataset metadata for deduplication and to update the metadata after import,
     * while the instance `this.elastic` is used for importing the datasets (potentially to a different cluster).
     */
    private get ingridMetaEsUtils() {
        return ElasticsearchFactory.getElasticUtils(ConfigService.getGeneralSettings().elasticsearch, this.summary);
    }

    /**
     * Gather all metadata from configured aliases that are used for InGrid-wide deduplication.
     * 
     * @param transactionHandle 
     * @param settings 
     * @param observer 
     */
    async prepareImport(transactionHandle: any, settings: ImporterSettings, observer: Observer<ImportLogMessage>): Promise<void> {
        await super.prepareImport(transactionHandle, settings, observer);
        // this.deduplicationMetadata = new Map<string, DeduplicationMetadata>();
        this.externalUuids = new Set<string>();

        const indices = await this.getExternalIndices();
        const total = await this.ingridMetaEsUtils.count(indices);

        // const scrollSearch = this.elastic.scroll<{ uuid: string, iPlugName: string, modified: Date }>(indices, ['uuid']);//, 'iPlugName', 'modified']);
        // TODO if necessary, implement slicing for scroll search
        const scrollSearch = this.ingridMetaEsUtils.scroll<{ uuid: string }>(indices, ['uuid']);//, 'iPlugName', 'modified']);
        let processed = 0;
        for await (const hit of scrollSearch) {
            // this.deduplicationMetadata.set(hit.uuid, {
            //     application: hit.iPlugName,
            //     modified: hit.modified
            // });
            this.externalUuids.add(hit.uuid);
            processed++;
            if (processed % 500 === 0 || processed === total) {
                const msg = 'Existierende Datensätze sammeln';
                log.info(`$msg: $processed/$total`);
                observer.next(this.summary.msgRunning(processed, total, msg));
            }
        }
    }

    /**
     * Update ingrid meta index.
     * 
     * @param transactionHandle 
     * @param settings 
     * @param observer 
     */
    async postImport(transactionHandle: any, settings: ImporterSettings, observer: Observer<ImportLogMessage>): Promise<void> {
        const iPlugClass = `de.ingrid.iplug.${settings.type.toLowerCase()}.dsc.${camelize(settings.type)}.DscSearchPlug`;
        const meta = await this.ingridMetaEsUtils.search(INGRID_META_INDEX,
            {
                "query": {
                    "term": {
                        "plugId": {
                            "value": settings.iPlugId,
                        }
                    }
                }
            }, false);
        if (meta.hits?.total?.value > 0) {
            let entry = meta.hits?.hits[0]._source;

            entry.lastIndexed = new Date().toISOString();
            entry.plugdescription.dataSourceName = settings.dataSourceName;
            entry.plugdescription.provider = settings.provider?.split(",")?.map(p => p.trim());
            entry.plugdescription.dataType = settings.datatype?.split(",")?.map(d => d.trim());
            entry.plugdescription.partner = settings.partner?.split(",")?.map(p => p.trim());

            await this.ingridMetaEsUtils.update(INGRID_META_INDEX, meta.hits?.hits[0]._id, entry, false);
        }
        else {
            const esSettings = this.settings.settings;
            let index = (esSettings.prefix ?? '') + esSettings.index;
            let entry = {
                "plugId": settings.iPlugId,
                "indexId": index,
                "iPlugName": APPLICATION_NAME,
                "lastIndexed": new Date().toISOString(),
                "linkedIndex": index,
                "plugdescription": {
                    "dataSourceName": settings.dataSourceName,
                    "provider": settings.provider?.split(",")?.map(p => p.trim()),
                    "dataType": settings.datatype?.split(",")?.map(d => d.trim()),
                    "partner": settings.partner?.split(",")?.map(p => p.trim()),
                    "ranking": [
                        "score"
                    ],
                    "iPlugClass": iPlugClass,
                    "fields": [],
                    "proxyServiceUrl": settings.iPlugId,
                    "useRemoteElasticsearch": true
                },
                "active": true
            }
            await this.ingridMetaEsUtils.index(INGRID_META_INDEX, entry, false);
        }
    }

    async processBucket(bucket: Bucket<IndexDocument>, importerSettings: ImporterSettings): Promise<EsOperation[]> {
        let box: EsOperation[] = [];
        // find primary document
        let { document, duplicates } = this.prioritizeAndFilter(bucket);
        if (!document) {
            return null;
        }

        // resolve CSW coupling
        if ('capabilities_url' in document) {
            for (let [id, service] of bucket.operatingServices) {
                this.resolveCoupling(document as IngridIndexDocument, service);
            }
        }

        // shortcut - if all documents in the bucket should be deleted, delete the document from ES
        let deleteDocument = document.extras.metadata.deleted != null;
        bucket.duplicates.forEach(duplicate => deleteDocument &&= duplicate.extras.metadata.deleted != null);
        if (deleteDocument) {
            return [{ operation: 'delete', _index: this.settings.settings.index, _id: document.uuid }];
        }

        // harvester deduplication
        for (let [id, duplicate] of duplicates) {
            let old_id = createEsId(document);
            let duplicate_id = createEsId(duplicate);
            document = this.deduplicate(document, duplicate);
            let document_id = createEsId(document);
            document.extras.metadata.merged_from.push(duplicate_id);
            // remove dataset with old_id if it differs from the newly created id
            if (old_id != document_id) {
                box.push({ operation: 'delete', _index: this.settings.settings.index, _id: old_id });
            }
            // remove data with duplicate _id if it differs from the newly created id
            if (duplicate_id != document_id) {
                box.push({ operation: 'delete', _index: this.settings.settings.index, _id: duplicate_id });
            }
        }

        // external deduplication
        // const externalDocument = this.deduplicationMetadata.get(document.uuid);
        // if (externalDocument) {
        //     // do not add document to index if it exists from another source, or from the same source but newer
        //     // in this case, directly return the box without adding the _index operation
        //     if (externalDocument.application != 'harvester' || externalDocument.modified >= document.extras.metadata.modified) {
        //         return box;
        //     }
        // }
        if (this.externalUuids.has(document.uuid)) {
            box.push({ operation: 'delete', _index: this.settings.settings.index, _id: createEsId(document) });
            return box;
        }

        // handle WFS
        if ('capabilities_url' in document) {
            this.createIdfForWfs(document as IngridIndexDocument, duplicates as Map<string | number, IngridIndexDocument>);
        }

        box.push({ operation: 'index', _index: this.settings.settings.index, _id: createEsId(document), document });
        return box;
    }

    private async getExternalIndices(): Promise<string[]> {
        const { hits } = await this.ingridMetaEsUtils.search(INGRID_META_INDEX, {
            "_source": ["linkedIndex"],
            "query": {
                "bool": {
                    "filter": [
                        { "term": { "active": true } },
                        { "term": { "plugdescription.dataType.keyword": "metadata" } }
                    ],
                    "must_not": [
                        { "term": { "iPlugName.keyword": APPLICATION_NAME } }
                    ]
                }
            }
        }, false);
        const indices = hits.hits.map(hit => hit._source.linkedIndex);
        return indices;
    }
    
    private prioritizeAndFilter(bucket: Bucket<IndexDocument>): {
        document: IndexDocument,
        duplicates: Map<string | number, IndexDocument>
    } {
        let mainDocument: IndexDocument;
        let duplicates: Map<string | number, IndexDocument> = new Map<string | number, IndexDocument>();

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
     * Deduplicate a dataset against a potential duplicate.
     *
     * @param document
     * @param duplicate
     * @returns the augmented dataset
     */
    private deduplicate(document: IndexDocument, duplicate: IndexDocument): IndexDocument {
        return document;
    }

    private resolveCoupling(document: IngridIndexDocument, additionalDoc: any) {
        if (!additionalDoc) {
            return;
        }

        if (additionalDoc.capabilities_url) {
            document.capabilities_url ??= [];
            document.capabilities_url.push(...additionalDoc.capabilities_url);
        }
        document.idf = this.addCrossReference(document.idf, additionalDoc);
        if (additionalDoc.hierarchylevel == 'service') {
            // add service information to document (dataset)
            document.refering ??= { object_reference: [] };
            document.refering.object_reference ??= [];
            document.refering.object_reference.push(this.createObjRef(additionalDoc, "3600"));
            document.refering_service_uuid ??= [];
            document.refering_service_uuid.push(additionalDoc.uuid+"@@"+additionalDoc.title+"@@"+additionalDoc.capabilities_url+"@@"+document.t011_obj_geo.datasource_uuid);
        }
        else {
            // add dataset information to document (service)
            document.object_reference ??= [];
            document.object_reference.push(this.createObjRef(additionalDoc, "3345"));
            if (!document.object_reference.some(obj_ref => obj_ref.special_ref == "3600")) {
                document.object_reference.push(this.createObjRef(additionalDoc, "3600", true));
            }
        }
    }

    private addCrossReference(idf: string, additionalDoc: IngridIndexDocument): string {
        let direction = additionalDoc.hierarchylevel == 'service' ? 'IN' : 'OUT';
        // let objectType = additionalDoc.hierarchylevel == 'service' ? 3 : 1;
        let crossReference = escapeIdf`
<idf:crossReference direction="${direction}" orig-uuid="${additionalDoc.uuid}" uuid="${additionalDoc.uuid}">
    <idf:objectName>${additionalDoc.title}</idf:objectName>
    <idf:attachedToField entry-id="3600" list-id="2000">Gekoppelte Daten</idf:attachedToField>
    <idf:objectType>${additionalDoc.t01_object.obj_class}</idf:objectType>
    <idf:description>${additionalDoc.summary}</idf:description>`;
        if (additionalDoc.hierarchylevel == 'service') {
            let idx = additionalDoc.t011_obj_serv_operation?.findIndex(op => op.name?.toLowerCase() == 'getcapabilities');
            crossReference += escapeIdf`
    <idf:serviceType>${additionalDoc.t011_obj_serv?.type ?? ""}</idf:serviceType>
    <idf:serviceVersion>${additionalDoc.t011_obj_serv_version?.version_value ?? ""}</idf:serviceVersion>
    <idf:serviceOperation>${additionalDoc.t011_obj_serv_operation?.[idx]?.name ?? ""}</idf:serviceOperation>
    <idf:serviceUrl>${additionalDoc.t011_obj_serv_op_connpoint?.[idx]?.connect_point ?? ""}</idf:serviceUrl>`;
        }
        let addHtml = Array.isArray(additionalDoc.additional_html_1) ? additionalDoc.additional_html_1[0] : additionalDoc.additional_html_1;
        let browseGraphic = addHtml?.match(/<img src=["'](.*?)["'].*/)?.[1];
        if (browseGraphic) {
            crossReference += escapeIdf`
    <idf:graphicOverview>${browseGraphic}</idf:graphicOverview>`
        }
        else {
            crossReference += `
    <idf:graphicOverview/>`
        }
        crossReference += `
</idf:crossReference>`;
        return idf.replace('</idf:idfMdMetadata>', `${crossReference}\n</idf:idfMdMetadata>`);
    }

    private createObjRef(doc: IngridIndexDocument, special_ref: string, skeletonOnly: boolean = false) {
        return {
            obj_uuid: doc.uuid,
            obj_to_uuid: doc.uuid,
            obj_name: skeletonOnly ? "" : doc.title ?? "",
            obj_class: skeletonOnly ? "" : doc.hierarchylevel == 'service' ? "3" : "1",
            special_name: skeletonOnly ? "" : "Gekoppelte Daten",
            special_ref: special_ref,
            type: skeletonOnly ? "" : doc.t011_obj_serv?.type ?? "",
            version: skeletonOnly ? "" : doc.t011_obj_serv_version?.version_value ?? ""
        }
    }

    private createIdfForWfs(document: IngridIndexDocument, duplicates: Map<string | number, IngridIndexDocument>) {
        // create idf
        let features = [];
        for (let [id, featureDocument] of duplicates) {
            features.push(featureDocument.idf);
        }
        document.idf = document.idf.replace('<h2>Features:</h2>', '<h2>Features:</h2>\n' + features.join('\n'));
    }
}

function escapeIdf(literals: TemplateStringsArray, ...substitutions: any[]) {
    return literals.reduce((result, literal, i) => {
        const value = substitutions[i];
        const escaped = typeof value === 'string' ? escapeXml(value) : value;
        return result + literal + (escaped ?? '');
    }, '');
}
