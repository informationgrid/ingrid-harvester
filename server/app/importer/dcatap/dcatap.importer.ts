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
import { DataFactory, type Store } from 'n3';
import type { Observer } from 'rxjs';
import type { RecordEntity } from '../../model/entity.js';
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

export class DcatapImporter extends Importer<DcatapSettings> {

    private totalRecords = 0;
    private numIndexDocs = 0;

    constructor(settings: DcatapSettings) {
        super(settings);
    }

    protected getDefaultSettings(): DcatapSettings {
        return dcatapDefaults;
    }

    // only here for documentation - use the "default" exec function
    async exec(observer: Observer<ImportLogMessage>): Promise<void> {
        await super.exec(observer);
    }

    protected async fetchAndParse(url: string): Promise<DcatapPageResult> {
        const requestConfig = DcatapImporter.createRequestConfig(this.settings, url);
        const requestDelegate = new RequestDelegate(requestConfig);
        const responseText = await requestDelegate.doRequest();
        const harvestTime = new Date();
        const store = await parseRdfPayload(responseText, url);

        return {
            response: responseText,
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
            let uuid: string;
            if (idTerms.length > 0) {
                uuid = idTerms[0].value;
            }

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

            let mapper = new DcatapMapper(this.settings, recordSubject, store, response, harvestTime, this.summary);
            let documentFactory = ProfileFactoryLoader.get().getDocumentFactory(mapper);

            let doc: IndexDocument;
            let dcatapdeDoc: string;
            try {
                doc = await documentFactory.createIndexDocument();
                dcatapdeDoc = documentFactory.createDcatapdeDocument();
            }
            catch (e) {
                log.error('Error creating index document', e);
                this.summary.errors.push({ type: 'app', error: e.toString() });
                mapper.skipped = true;
            }

            if (!this.settings.dryRun && !mapper.shouldBeSkipped()) {
                let entity: RecordEntity = {
                    identifier: uuid,
                    source: this.settings.sourceURL,
                    catalog_ids: this.settings.catalogIds,
                    dataset: doc,
                    dataset_dcatapde: dcatapdeDoc,
                    original_document: mapper.getHarvestedData()
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
            }
            this.observer.next(this.summary.msgRunning(++this.numIndexDocs, this.totalRecords, this.getDownloadMessage()));
        }
        await Promise.all(promises).catch(err => log.error('Error indexing DCAT record', err));
    }

    static createRequestConfig(settings: DcatapSettings, url?: string): RequestOptions {
        let requestConfig: RequestOptions = {
            method: "GET",
            uri: url || settings.sourceURL,
            json: false,
            timeout: settings.timeout
        };
        return requestConfig;
    }
}
