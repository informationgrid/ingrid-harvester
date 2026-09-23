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
import { APPLICATION_NAME, INGRID_META_INDEX } from '../../../../app/constants.js';
import { ElasticsearchCatalog } from '../../../catalog/elasticsearch/elasticsearch.catalog.js';
import type { ImporterSettings } from '../../../importer/importer.settings.js';
import type { ImportLogMessage } from '../../../model/import.result.js';
import type { IndexDocument } from '../../../model/index.document.js';
import { ElasticsearchFactory } from '../../../persistence/elastic.factory.js';
import { validateDocument } from '../../../persistence/elastic.validation.js';
import type { EsOperation } from '../../../persistence/elastic.utils.js';
import type { Bucket, BucketDocument } from '../../../persistence/postgres.utils.js';
import { ConfigService } from '../../../services/config/ConfigService.js';
import { camelize, escapeXml } from '../../../utils/misc.utils.js';
import { ProfileFactoryLoader } from '../../profile.factory.loader.js';
import { createEsId } from '../ingrid.utils.js';
import type { IngridIndexDocument } from '../model/index.document.js';
import type { IngridDeprecatedIndexDocument } from '../model/index.document.deprecated.js';

const log = log4js.getLogger(import.meta.filename);

export class IngridElasticsearchCatalog extends ElasticsearchCatalog {

    // private deduplicationMetadata: Map<string, DeduplicationMetadata>;
    private externalUuids: Set<string>;
    private schema: object | null = null;

    /**
     * This ElasticUtils instance connects to the Elasticsearch cluster configured for the InGrid-wide metadata index,
     * instead of the catalog-specific cluster used by the main ElasticUtils instance of this class (`this.elastic`).
     * This is necessary to gather the existing dataset metadata for deduplication and to update the metadata after import,
     * while the instance `this.elastic` is used for importing the datasets (potentially to a different cluster).
     */
    private get ingridMetaEsUtils() {
        return ElasticsearchFactory.getElasticUtils(ConfigService.getGeneralSettings().elasticsearch, this.summary);
    }

    private async ensureIngridMetaIndex(): Promise<void> {
        const isPresent = await this.ingridMetaEsUtils.isIndexPresent(INGRID_META_INDEX);
        if (typeof isPresent !== 'boolean') {
            throw new Error(`Could not determine whether ${INGRID_META_INDEX} exists (elasticsearch not reachable?)`);
        }
        if (!isPresent) {
            const mapping = ProfileFactoryLoader.get().getIndexMappings('ingrid-meta-mapping');
            const settings = ProfileFactoryLoader.get().getIndexSettings('ingrid-meta-settings');
            await this.ingridMetaEsUtils.prepareIndexWithName(INGRID_META_INDEX, mapping, settings);
        }
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
        this.schema = ProfileFactoryLoader.get().getIndexSchema(this.settings.settings.mappingFile);
        // ensure the InGrid-wide metadata index exists before it is used below (and later in postImport())
        await this.ensureIngridMetaIndex();
        // this.deduplicationMetadata = new Map<string, DeduplicationMetadata>();
        this.externalUuids = new Set<string>();

        const indices = await this.getExternalIndices();
        if (indices?.length == 0) {
            log.info(`No existing indices found that are not managed by InGrid Harvester, skipping InGrid-wide deduplication.`);
            return;
        }
        const total = await this.ingridMetaEsUtils.count(indices);

        // skip scrolling in case no documents exist, to avoid scrolling cleanup errors
        if (total == 0) {
            log.info(`No existing datasets found for indices ${indices}, skipping InGrid-wide deduplication.`);
            return;
        }

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
                log.info(`${msg}: ${processed}/${total}`);
                observer.next(this.summary.msgRunning(processed, total, msg));
            }
        }
    }

    protected getBucketQuery(importerSettings: ImporterSettings): string {
        if (importerSettings['wfsProfile'] == 'zdm') {
            return ProfileFactoryLoader.get().getPostgresQueries().getModifiedBuckets('zdm');
        }
        return super.getBucketQuery(importerSettings);
    }

    async importIntoCatalog(operations: EsOperation[]) {
        let validOps = operations;
        if (operations?.length && this.schema) {
            const schemaId = (this.schema as any).$id;
            validOps = [];
            for (const op of operations) {
                if (op.document && ['index', 'create', 'update'].includes(op.operation)) {
                    // $schema documents the JSON schema used for validation, determined by the mapping selected for this catalog
                    if (schemaId) {
                        op.document.$schema = schemaId;
                    }
                    const errors = validateDocument(op.document, this.schema);
                    if (errors.length) {
                        const msg = `Schema validation failed for ${op._id}: ${errors.join('; ')}`;
                        log.error(msg);
                        this.summary.errors.push({ type: 'app', error: msg });
                        continue;
                    }
                }
                validOps.push(op);
            }
        }
        await super.importIntoCatalog(validOps);
    }

    /**
     * Update ingrid meta index.
     *
     * @param transactionHandle
     * @param importerSettings
     * @param observer
     */
    async postImport(transactionHandle: any, importerSettings: ImporterSettings, observer: Observer<ImportLogMessage>): Promise<void> {
        const esSettings = this.settings.settings;
        const index = (esSettings.prefix ?? '') + esSettings.index;
        const iPlugClass = `de.ingrid.iplug.${importerSettings.type.toLowerCase()}.dsc.${camelize(importerSettings.type)}.DscSearchPlug`;
        let entry = {
            "plugId": importerSettings.iPlugId,
            "indexId": index,
            "iPlugName": APPLICATION_NAME,
            "lastIndexed": new Date().toISOString(),
            "linkedIndex": index,
            "plugdescription": {
                "dataSourceName": importerSettings.dataSourceName,
                "provider": importerSettings.provider?.split(",")?.map(p => p.trim()),
                "dataType": importerSettings.datatype?.split(",")?.map(d => d.trim()),
                "partner": importerSettings.partner?.split(",")?.map(p => p.trim()),
                "ranking": [
                    "score"
                ],
                "iPlugClass": iPlugClass,
                "fields": [],
                "proxyServiceUrl": importerSettings.iPlugId,
                "useRemoteElasticsearch": true
            },
            "active": true
        }
        const meta = await this.ingridMetaEsUtils.search(INGRID_META_INDEX, {
                "query": {
                    "term": {
                        "plugId": {
                            "value": importerSettings.iPlugId,
                        }
                    }
                }
            }, false);
        if (meta.hits?.total?.value > 0) {
            entry = {
                ...meta.hits?.hits[0]._source,
                ...entry
            }
            await this.ingridMetaEsUtils.update(INGRID_META_INDEX, meta.hits?.hits[0]._id, entry, false);
        }
        else {
            await this.ingridMetaEsUtils.index(INGRID_META_INDEX, entry, false);
        }
    }

    async processBucket(bucket: Bucket<IndexDocument>, importerSettings: ImporterSettings): Promise<EsOperation[]> {
        let box: EsOperation[] = [];
        // find primary document
        let { entry, duplicates } = this.prioritizeAndFilter(bucket);
        if (!entry?.document) {
            return null;
        }
        let document = entry.document;

        // resolve CSW coupling
        if (isCsw(entry)) {
            for (let [id, service] of bucket.operatingServices) {
                if (isDeprecatedIngridShape(document)) {
                    this.resolveCouplingDeprecated(document as unknown as IngridDeprecatedIndexDocument, service);
                }
                else {
                    this.resolveCoupling(document as IngridIndexDocument, service);
                }
            }
        }

        // shortcut - if all documents in the bucket should be deleted, delete the document from ES
        let deleteDocument = entry.deleted != null;
        bucket.duplicates.forEach(duplicate => deleteDocument &&= duplicate.deleted != null);
        if (deleteDocument) {
            return [{ operation: 'delete', _index: this.settings.settings.index, _id: document.id }];
        }

        // harvester deduplication
        for (let [id, duplicate] of duplicates) {
            let old_id = createEsId(document);
            let duplicate_id = createEsId(duplicate.document);
            document = this.deduplicate(document, duplicate.document);
            let document_id = createEsId(document);
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
        //     if (externalDocument.application != 'harvester' || externalDocument.modified >= entry.modified) {
        //         return box;
        //     }
        // }
        if (this.externalUuids.has(document.id)) {
            box.push({ operation: 'delete', _index: this.settings.settings.index, _id: createEsId(document) });
            return box;
        }

        // handle WFS
        if (isWfs(entry)) {
            if (isDeprecatedIngridShape(document)) {
                this.createIdfForWfsDeprecated(document as unknown as IngridDeprecatedIndexDocument, duplicates);
            }
            else {
                this.createIdfForWfs(document as IngridIndexDocument, duplicates);
            }
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
        if (additionalDoc.references?.length) {
            document.references ??= [];
            document.references.push(...additionalDoc.references);
        }
        // additionalDoc is another already-mapped IngridIndexDocument from the same coupling
        // (service<->dataset), resolved via the `coupling` table / getBuckets.sql join - only
        // there (not in a per-record mapper) are both sides of the relationship available at once
        const additionalDocIsService = additionalDoc.metadata?.document_type === 'InGridGeoService';
        document.ingrid.cross_references ??= [];
        document.ingrid.cross_references.push({
            uuid: additionalDoc.id,
            name: additionalDoc.title,
            document_type: additionalDoc.metadata?.document_type,
            description: additionalDoc.description,
            // matches the old codelist-2000 labels: 3600 "Gekoppelte Daten" when the coupled
            // record is the service (viewed from the dataset), 3345 "Basisdaten" when it's the
            // dataset (viewed from the service) - see codelist_2000.xml
            reference_type: additionalDocIsService ? 'Gekoppelte Daten' : 'Basisdaten',
            direction: additionalDocIsService ? 'IN' : 'OUT',
        });
    }

    private createIdfForWfs(document: IngridIndexDocument, duplicates: Map<string | number, BucketDocument<IndexDocument>>) {
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

    // deprecated-shape (IngridDeprecatedIndexDocument) equivalents of resolveCoupling()/createIdfForWfs()
    // above, ported from the pre-migration catalog (still live on main) - the old shape has no
    // `ingrid.cross_references`/`references`/`exports.iso`, coupling is expressed instead via
    // capabilities_url/refering/object_reference and an IDF cross-reference XML fragment built from
    // t01_object/t011_obj_serv* fields.
    private resolveCouplingDeprecated(document: IngridDeprecatedIndexDocument, additionalDoc: any) {
        if (!additionalDoc) {
            return;
        }
        if (additionalDoc.capabilities_url) {
            document.capabilities_url ??= [];
            document.capabilities_url.push(...additionalDoc.capabilities_url);
        }
        document.idf = this.addCrossReferenceDeprecated(document.idf, additionalDoc);
        if (additionalDoc.hierarchylevel == 'service') {
            // add service information to document (dataset)
            document.refering ??= { object_reference: [] };
            document.refering.object_reference ??= [];
            document.refering.object_reference.push(this.createObjRefDeprecated(additionalDoc, "3600"));
            document.refering_service_uuid ??= [];
            document.refering_service_uuid.push(additionalDoc.uuid + "@@" + additionalDoc.title + "@@" + additionalDoc.capabilities_url + "@@" + document.t011_obj_geo?.datasource_uuid);
        }
        else {
            // add dataset information to document (service)
            document.object_reference ??= [];
            document.object_reference.push(this.createObjRefDeprecated(additionalDoc, "3345"));
            if (!document.object_reference.some(obj_ref => obj_ref.special_ref == "3600")) {
                document.object_reference.push(this.createObjRefDeprecated(additionalDoc, "3600", true));
            }
        }
    }

    private addCrossReferenceDeprecated(idf: string, additionalDoc: any): string {
        let direction = additionalDoc.hierarchylevel == 'service' ? 'IN' : 'OUT';
        let crossReference = escapeIdf`
<idf:crossReference direction="${direction}" orig-uuid="${additionalDoc.uuid}" uuid="${additionalDoc.uuid}">
    <idf:objectName>${additionalDoc.title}</idf:objectName>
    <idf:attachedToField entry-id="3600" list-id="2000">Gekoppelte Daten</idf:attachedToField>
    <idf:objectType>${additionalDoc.t01_object?.obj_class}</idf:objectType>
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
        return idf?.replace('</idf:idfMdMetadata>', `${crossReference}\n</idf:idfMdMetadata>`);
    }

    private createObjRefDeprecated(doc: any, special_ref: string, skeletonOnly: boolean = false) {
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

    private createIdfForWfsDeprecated(document: IngridDeprecatedIndexDocument, duplicates: Map<string | number, BucketDocument<IndexDocument>>) {
        let features = [];
        for (let [id, entry] of duplicates) {
            let featureDocument = entry.document as unknown as IngridDeprecatedIndexDocument;
            if ((featureDocument as any).is_feature_type === false) {
                features.push(featureDocument.idf);
            }
        }
        document.idf = document?.idf?.replace('<h2>Features:</h2>', '<h2>Features:</h2>\n' + features.join('\n'));
    }
}

// checks both the new shape's field (document.metadata.datasource.type) and the deprecated shape's
// (document.extras.metadata.source.source_type, the same field main's own isCsw/isWfs still read) -
// exactly one of the two is ever populated, depending on which shape this catalog's mapping produces.
function isCsw(entry: BucketDocument<IndexDocument>): boolean {
    const document = entry.document as any;
    return document.metadata?.datasource?.type === 'csw' || document.extras?.metadata?.source?.source_type === 'csw';
}

function isWfs(entry: BucketDocument<IndexDocument>): boolean {
    const document = entry.document as any;
    return document.metadata?.datasource?.type === 'wfs' || document.extras?.metadata?.source?.source_type === 'wfs';
}

// true only for IngridDeprecatedIndexDocument (the old flat "ingrid" shape) - the only ingrid-family
// document shape with a `uuid` but no `id`. opendata-deprecated documents never reach the call sites
// that use this (isCsw()/isWfs() are always false for CKAN/DCAT-AP.de/Genesis-sourced documents).
function isDeprecatedIngridShape(document: any): boolean {
    return 'uuid' in document && !('id' in document);
}

function escapeIdf(literals: TemplateStringsArray, ...substitutions: any[]) {
    return literals.reduce((result, literal, i) => {
        const value = substitutions[i];
        const escaped = typeof value === 'string' ? escapeXml(value) : value;
        return result + literal + (escaped ?? '');
    }, '');
}
