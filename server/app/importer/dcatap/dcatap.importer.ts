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

import type { Quad_Subject } from '@rdfjs/types';
import log4js from 'log4js';
import { DataFactory, type Store } from 'n3';
import type { Observer } from 'rxjs';
import type { RecordEntity } from '../../model/entity.js';
import type { DocumentFactory } from '../../model/index.document.factory.js';
import type { ImportLogMessage } from '../../model/import.result.js';
import type { IndexDocument } from '../../model/index.document.js';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader.js';
import type { RequestOptions } from '../../utils/http-request.utils.js';
import { RequestDelegate } from '../../utils/http-request.utils.js';
import * as MiscUtils from '../../utils/misc.utils.js';
import { Importer } from '../importer.js';
import { namespaces } from '../namespaces.js';
import { DcatapMapper } from './dcatap.mapper.js';
import { parseRdfPayload } from './dcatap.rdf.js';
import { dcatapDefaults, type DcatapSettings } from './dcatap.settings.js';

const log = log4js.getLogger(import.meta.filename);
const logRequest = log4js.getLogger('requests');

export interface DcatapPageResult {
    response: string;
    store: Store;
    harvestTime: Date;
}

/**
 * DCAT-AP importer; base class of DCAT-AP profile importers (e.g. `DcatapdeImporter`), which override
 * `fetchAndParse()`, `createMapper()`, `getRecordOriginalDocument()` and `createCswDocument()`.
 */
export class DcatapImporter<S extends DcatapSettings = DcatapSettings> extends Importer<S> {

    private totalRecords = 0;
    private numIndexDocs = 0;

    constructor(settings: S) {
        super(settings);
    }

    protected getDefaultSettings(): S {
        return dcatapDefaults as S;
    }

    // only here for documentation - use the "default" exec function
    async exec(observer: Observer<ImportLogMessage>): Promise<void> {
        await super.exec(observer);
    }

    protected async fetchAndParse(url: string): Promise<DcatapPageResult> {
        const requestConfig = DcatapImporter.createRequestConfig(this.settings, url);
        const requestDelegate = new RequestDelegate(requestConfig);
        const response = await requestDelegate.doRequest();
        const harvestTime = new Date();
        const store = await parseRdfPayload(response, url);

        return {
            response,
            store,
            harvestTime
        };
    }

    protected async harvest(): Promise<number> {
        let retries = 0;
        let currentUrl: string | undefined = this.settings.sourceURL;

        while (currentUrl) {
            log.debug(`Requesting records from ${currentUrl}`);
            let pageResult: DcatapPageResult;
            try {
                pageResult = await this.fetchAndParse(currentUrl);
            }
            catch (err) {
                const message = `Error fetching or parsing RDF payload from ${currentUrl}. Error: ${err.message}`;
                log.error(message, err);
                this.summary.errors.push({ type: 'app', error: message });
                if (retries++ > 3) {
                    log.error('Stopped after 3 Retries');
                    break;
                }
                continue;
            }

            const { response, store, harvestTime } = pageResult;
            let isLastPage = false;

            const pagedCollections = store.getSubjects(
                DataFactory.namedNode(namespaces.RDF + 'type'),
                DataFactory.namedNode(namespaces.HYDRA + 'PagedCollection'),
                null
            );

            if (pagedCollections.length > 0) {
                retries = 0;
                const pagedCollection = pagedCollections[0];

                const datasetSubjects = store.getSubjects(
                    DataFactory.namedNode(namespaces.RDF + 'type'),
                    DataFactory.namedNode(namespaces.DCAT + 'Dataset'),
                    null
                );
                const numReturned = datasetSubjects.length;

                const totalItemsTerms = store.getObjects(pagedCollection, DataFactory.namedNode(namespaces.HYDRA + 'totalItems'), null);
                if (totalItemsTerms.length > 0) {
                    this.totalRecords = parseInt(totalItemsTerms[0].value, 10);
                }

                const thisPageUrl = pagedCollection.value;
                const lastPageTerms = store.getObjects(pagedCollection, DataFactory.namedNode(namespaces.HYDRA + 'lastPage'), null);
                const lastPageUrl = lastPageTerms.length > 0 ? lastPageTerms[0].value : undefined;

                isLastPage = thisPageUrl === lastPageUrl;
                if (!isLastPage) {
                    const nextPageTerms = store.getObjects(pagedCollection, DataFactory.namedNode(namespaces.HYDRA + 'nextPage'), null);
                    if (nextPageTerms.length > 0) {
                        currentUrl = nextPageTerms[0].value;
                    }
                    else {
                        isLastPage = true;
                    }
                }

                log.debug(`Received ${numReturned} records from ${this.settings.sourceURL} - Page: ${thisPageUrl}`);
                await this.extractRecords(response, store, harvestTime);
            }
            else {
                const datasetSubjects = store.getSubjects(
                    DataFactory.namedNode(namespaces.RDF + 'type'),
                    DataFactory.namedNode(namespaces.DCAT + 'Dataset'),
                    null
                );
                const numReturned = datasetSubjects.length;
                if (numReturned > 0) {
                    if (this.totalRecords === 0) {
                        this.totalRecords = numReturned;
                    }
                    log.debug(`Received ${numReturned} records from ${currentUrl}`);
                    await this.extractRecords(response, store, harvestTime);
                    isLastPage = true;
                }
                else {
                    const message = `Error while fetching DCAT Records. Will continue to try and fetch next records, if any.\nServer response: ${MiscUtils.truncateErrorMessage(response)}.`;
                    log.error(message);
                    this.summary.errors.push({ type: 'app', error: message });
                    if (retries++ > 3) {
                        isLastPage = true;
                        log.error('Stopped after 3 Retries');
                    }
                }
            }

            if (isLastPage) break;
        }
        await this.database.sendBulkData();

        return this.numIndexDocs;
    }

    async extractRecords(response: string, store: Store, harvestTime: Date) {
        let promises = [];
        const records = store.getSubjects(
            DataFactory.namedNode(namespaces.RDF + 'type'),
            DataFactory.namedNode(namespaces.DCAT + 'Dataset'),
            null
        );

        for (let i = 0; i < records.length; i++) {
            this.summary.numDocs++;
            const recordSubject = records[i];

            const idTerms = store.getObjects(recordSubject, DataFactory.namedNode(namespaces.DCT + 'identifier'), null);
            let sourceIdentifier: string;
            if (idTerms.length > 0) {
                sourceIdentifier = idTerms[0].value;
            }

            let mapper: DcatapMapper<S>;
            try {
                mapper = this.createMapper(recordSubject, store, response, harvestTime);
            }
            catch (e) {
                log.error('Error creating mapper', e);
                this.summary.errors.push({ type: 'app', error: e.toString() });
                this.summary.skippedDocs.push(sourceIdentifier ?? recordSubject.value);
                continue;
            }
            // dct:identifier after applying idRegex, also used as ES uuid and ISO fileIdentifier
            const uuid = mapper.getGeneratedId();

            if (!this.filterUtils.isIdAllowed(uuid)) {
                this.summary.skippedDocs.push(uuid);
                continue;
            }

            if (log.isDebugEnabled()) {
                log.debug(`Import document ${i + 1} from ${records.length}`);
            }
            if (logRequest.isDebugEnabled()) {
                logRequest.debug('Record subject: ', recordSubject.value);
            }

            let documentFactory = ProfileFactoryLoader.get().getDocumentFactory(mapper);

            let elasticDoc: IndexDocument;
            let dcatapdeDoc: string;
            let cswDoc: string;
            let documentError = false;
            try {
                elasticDoc = await documentFactory.createIndexDocument();
                dcatapdeDoc = await documentFactory.createDcatapdeDocument();
                cswDoc = await this.createCswDocument(documentFactory);
            }
            catch (e) {
                log.error('Error creating index document', e);
                this.summary.errors.push({ type: 'app', error: e.toString() });
                documentError = true;
                mapper.skipped = true;
            }

            const skipped = mapper.shouldBeSkipped();
            if (!this.settings.dryRun && !skipped) {
                let entity: RecordEntity = {
                    identifier: uuid,
                    source: this.settings.sourceURL,
                    catalog_ids: this.settings.catalogIds,
                    dataset: elasticDoc,
                    dataset_dcatapde: dcatapdeDoc,
                    dataset_csw: cswDoc,
                    original_document: this.getRecordOriginalDocument(response, recordSubject, sourceIdentifier, mapper)
                };
                promises.push(
                    this.addEntityToBulk(entity)
                        .then(response => {
                            if (!response.queued) {
                                // numIndexDocs += ElasticsearchUtils.maxBulkSize;
                                // this.observer.next(ImportResult.running(numIndexDocs, records.length));
                            }
                        })
                );
            }
            else {
                this.summary.skippedDocs.push(uuid);
                // skipped by the mapper (e.g. filterTags, filterThemes) on purpose, not because of an error
                if (skipped && !documentError) {
                    this.summary.filteredDocs.push(uuid);
                }
            }
            this.observer.next(this.summary.msgRunning(++this.numIndexDocs, this.totalRecords, this.getDownloadMessage()));
        }
        await Promise.all(promises).catch(err => log.error('Error indexing DCAT record', err));
    }

    protected createMapper(recordSubject: Quad_Subject, store: Store, response: string, harvestTime: Date): DcatapMapper<S> {
        return new DcatapMapper<S>(this.settings, recordSubject, store, response, harvestTime, this.summary);
    }

    /**
     * @returns the original document of the record, see `getOriginalDocument()`
     */
    protected getRecordOriginalDocument(response: string, recordSubject: Quad_Subject, sourceIdentifier: string, mapper: DcatapMapper<S>): any {
        return DcatapImporter.getOriginalDocument(response, recordSubject, sourceIdentifier, mapper.getDatasetElement());
    }

    protected async createCswDocument(documentFactory: DocumentFactory<IndexDocument>): Promise<string> {
        return documentFactory.createCswIsoDocument();
    }

    /**
     * Returns the original document of a single record.
     * For JSON-LD payloads, the catalog wrapper (`@context`, `@id`, `@type`, ...) is kept,
     * but dataset lists (e.g. `dcat:dataset`) only contain the dataset of the given record
     * (matched by the raw `dct:identifier` = `sourceIdentifier` or `@id` = record subject).
     * For RDF/XML payloads (`datasetElement` given), the root element is kept with `datasetElement`,
     * the resources it references and the unreferenced resources (e.g. `hydra:PagedCollection`, `dcat:Catalog`),
     * see `copyWithDatasetOnly()`.
     * Other payloads are returned unchanged.
     */
    static getOriginalDocument(payload: any, recordSubject: Quad_Subject, sourceIdentifier: string, datasetElement?: Element): any {
        if (datasetElement) {
            return '<?xml version="1.0" encoding="UTF-8"?>\n' + DcatapImporter.copyWithDatasetOnly(datasetElement).toString();
        }
        let json = payload;
        if (typeof payload === 'string') {
            try {
                json = JSON.parse(payload);
            }
            catch {
                return payload;
            }
        }
        if (json == null || typeof json !== 'object' || Array.isArray(json)) {
            return payload;
        }

        const isRecordDataset = (item: any): boolean => {
            if (item == null || typeof item !== 'object') {
                return false;
            }
            const identifiers = [].concat(item['dct:identifier'] ?? item['dcterms:identifier'] ?? item['identifier'] ?? []);
            if (sourceIdentifier && identifiers.some(id => (id?.['@value'] ?? id) === sourceIdentifier)) {
                return true;
            }
            return item['@id'] === recordSubject.value;
        };

        const document = { ...json };
        for (const [key, value] of Object.entries(json)) {
            if (key === '@context' || !Array.isArray(value)) {
                continue;
            }
            const dataset = value.find(isRecordDataset);
            if (dataset) {
                document[key] = [dataset];
            }
        }
        return typeof payload === 'string' ? JSON.stringify(document) : document;
    }

    /**
     * Copy of the RDF/XML root element of `dataset` that only contains
     * - `dataset` and the top-level resources it references transitively (e.g. `dcat:Distribution`),
     * - top-level resources not referenced by any other resource (e.g. `dcat:Catalog`, `hydra:PagedCollection`),
     *   without their properties referring to or containing other datasets (e.g. `dcat:dataset`).
     */
    private static copyWithDatasetOnly(dataset: Element): Element {
        const root = dataset.ownerDocument.documentElement;
        const getId = (element: Element) => element.getAttributeNS(namespaces.RDF, 'about') || element.getAttributeNS(namespaces.RDF, 'nodeID');
        const getReferences = (element: Element): string[] => Array.from(element.getElementsByTagName('*'))
            .flatMap(child => [child.getAttributeNS(namespaces.RDF, 'resource'), child.getAttributeNS(namespaces.RDF, 'nodeID')])
            .filter(Boolean);

        const otherDatasets = new Set(Array.from(root.getElementsByTagNameNS(namespaces.DCAT, 'Dataset')).filter(element => element !== dataset));
        const otherDatasetIds = new Set(Array.from(otherDatasets).map(getId).filter(Boolean));
        const allTopLevel = Array.from(root.childNodes).filter(node => node.nodeType === 1) as Element[];
        // references between different resources (e.g. `dcat:Catalog` refers to itself via `foaf:homepage`)
        const referenced = new Set(allTopLevel.flatMap(element => getReferences(element).filter(reference => reference !== getId(element))));
        const topLevel = allTopLevel.filter(element => !otherDatasets.has(element));
        const topLevelById = new Map(topLevel.map(element => [getId(element), element]));

        const copies = new Map<Element, Element>();
        const queue: Element[] = [dataset];
        if (dataset.parentNode === root) {
            copies.set(dataset, dataset.cloneNode(true) as Element);
        }
        for (const element of topLevel) {
            if (element !== dataset && !referenced.has(getId(element))) {
                const copy = DcatapImporter.copyWithoutOtherDatasets(element, dataset, otherDatasetIds);
                copies.set(element, copy);
                queue.push(copy);
            }
        }
        while (queue.length > 0) {
            for (const reference of getReferences(queue.shift())) {
                const element = topLevelById.get(reference);
                if (element && !copies.has(element)) {
                    const copy = element.cloneNode(true) as Element;
                    copies.set(element, copy);
                    queue.push(copy);
                }
            }
        }

        const rootCopy = root.cloneNode(false) as Element;
        for (const element of topLevel.filter(element => copies.has(element))) {
            rootCopy.appendChild(root.ownerDocument.createTextNode('\n  '));
            rootCopy.appendChild(copies.get(element));
        }
        rootCopy.appendChild(root.ownerDocument.createTextNode('\n'));
        return rootCopy;
    }

    /**
     * Copy of `element` without child properties that refer to (`rdf:resource`) or contain a dataset other than `dataset`.
     * `dcat:dataset` properties are only kept if they refer to or contain `dataset`
     * (catalogs may reference datasets of other pages).
     */
    private static copyWithoutOtherDatasets(element: Element, dataset: Element, otherDatasetIds: Set<string>): Element {
        const datasetId = dataset.getAttributeNS(namespaces.RDF, 'about');
        const copy = element.cloneNode(false) as Element;
        for (const child of Array.from(element.childNodes)) {
            let refersToOtherDataset = false;
            if (child.nodeType === 1) {
                const property = child as Element;
                const resource = property.getAttributeNS(namespaces.RDF, 'resource');
                const nestedDatasets = Array.from(property.getElementsByTagNameNS(namespaces.DCAT, 'Dataset'));
                const isDatasetProperty = property.namespaceURI === namespaces.DCAT && property.localName === 'dataset';
                refersToOtherDataset = otherDatasetIds.has(resource)
                    || nestedDatasets.some(nested => nested !== dataset)
                    || (isDatasetProperty && !(resource && resource === datasetId) && !nestedDatasets.includes(dataset));
            }
            if (!refersToOtherDataset) {
                copy.appendChild(child.cloneNode(true));
            }
            else if (copy.lastChild?.nodeType === 3 && !copy.lastChild.nodeValue.trim()) {
                // drop indentation of removed property
                copy.removeChild(copy.lastChild);
            }
        }
        return copy;
    }

    static createRequestConfig(settings: DcatapSettings, url?: string): RequestOptions {
        let requestConfig: RequestOptions = {
            method: "GET",
            uri: url || settings.sourceURL,
            json: settings.sourceURL.endsWith('.json') || settings.sourceURL.endsWith('.jsonld'),
            timeout: settings.timeout
        };
        return requestConfig;
    }
}
