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

import type { DOMParser } from '@xmldom/xmldom';
import log4js from 'log4js';
import type { Observer } from 'rxjs';
import { namespaces } from '../../importer/namespaces.js';
import type { RecordEntity } from '../../model/entity.js';
import type { ImportLogMessage } from '../../model/import.result.js';
import type { IndexDocument } from '../../model/index.document.js';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader.js';
import type { RequestOptions } from '../../utils/http-request.utils.js';
import { RequestDelegate } from '../../utils/http-request.utils.js';
import * as MiscUtils from '../../utils/misc.utils.js';
import { dereferenceRdfElements } from "../../utils/rdf.utils.js";
import { Importer } from '../importer.js';
import { DcatapdeMapper } from './dcatapde.mapper.js';
import type { DcatapdeSettings } from './dcatapde.settings.js';
import { defaultDCATAPDESettings } from './dcatapde.settings.js';

const log = log4js.getLogger(import.meta.filename);
const logRequest = log4js.getLogger('requests');

export class DcatapdeImporter extends Importer<DcatapdeSettings> {

    protected domParser: DOMParser;
    protected requestConfig : RequestOptions;
    protected requestDelegate: RequestDelegate;

    private totalRecords = 0;
    private numIndexDocs = 0;

    constructor(settings: DcatapdeSettings, requestDelegate?: RequestDelegate) {
        // merge default settings with configured ones
        settings = MiscUtils.merge(defaultDCATAPDESettings, settings);
        super(settings);

        this.domParser = MiscUtils.getDomParser();

        if (requestDelegate) {
            this.requestDelegate = requestDelegate;
        } else {
            this.requestConfig = DcatapdeImporter.createRequestConfig(settings);
            this.requestDelegate = new RequestDelegate(this.requestConfig);
        }
    }

    // only here for documentation - use the "default" exec function
    async exec(observer: Observer<ImportLogMessage>): Promise<void> {
        await super.exec(observer);
    }

    protected async harvest(): Promise<number> {
        let retries = 0;

        while (true) {
            log.debug('Requesting next records');
            let response = await this.requestDelegate.doRequest();
            let harvestTime = new Date(Date.now());

            let responseDom = this.domParser.parseFromString(response);

            let isLastPage = false;

            let pagedCollection = responseDom.getElementsByTagNameNS(namespaces.HYDRA, 'PagedCollection')[0];
            if (pagedCollection) {
                retries = 0;

                let numReturned = responseDom.getElementsByTagNameNS(namespaces.DCAT, 'Dataset').length;
                this.totalRecords = parseInt(DcatapdeMapper.select('./hydra:totalItems', pagedCollection, true).textContent);

                let thisPageUrl = pagedCollection.getAttribute('rdf:about');
                let lastPageUrl = DcatapdeMapper.select('./hydra:lastPage', pagedCollection, true)?.textContent;

                isLastPage = thisPageUrl === lastPageUrl;
                if(!isLastPage){
                    let nextPageUrl = DcatapdeMapper.select('./hydra:nextPage', pagedCollection, true).textContent;
                    this.requestConfig.uri = nextPageUrl;
                    this.requestDelegate = new RequestDelegate(this.requestConfig);
                }

                log.debug(`Received ${numReturned} records from ${this.getSettings().sourceURL} - Page: ${thisPageUrl}`);
                await this.extractRecords(response, harvestTime)
            }
            else {
                let numReturned = responseDom.getElementsByTagNameNS(namespaces.DCAT, 'Dataset').length;
                if(numReturned > 0){
                    await this.extractRecords(response, harvestTime);
                    isLastPage = true;
                } else {
                    const message = `Error while fetching DCAT Records. Will continue to try and fetch next records, if any.\nServer response: ${MiscUtils.truncateErrorMessage(responseDom.toString())}.`;
                    log.error(message);
                    this.getSummary().errors.push({ type: 'app', error: message });
                    if(retries++ > 3){
                        isLastPage = true;
                        log.error('Stopped after 3 Retries')
                    }
                }
            }

            if (isLastPage) break;
        }
        await this.database.sendBulkData();

        return this.numIndexDocs;
    }

    async extractRecords(getRecordsResponse, harvestTime) {
        let promises = [];
        let xml = this.domParser.parseFromString(getRecordsResponse, 'application/xml');
        let rootNode = xml.getElementsByTagNameNS(namespaces.RDF, 'RDF')[0];

        dereferenceRdfElements(rootNode, './/dcat:distribution | .//dct:publisher | .//dcat:contactPoint', DcatapdeMapper.select)

        let records =  DcatapdeMapper.select('./dcat:Catalog/dcat:dataset/dcat:Dataset|./dcat:Dataset', rootNode);

        /*
        let ids = [];
        for (let i = 0; i < records.length; i++) {
            let uuid = DcatapdeMapper.select('./dct:identifier', records[i], true).textContent;
            if(!uuid) {
                uuid = DcatapdeMapper.select('./dct:identifier/@rdf:resource', records[i], true).textContent;
            }
            ids.push(uuid);
        }

         */

        for (let i = 0; i < records.length; i++) {
            this.getSummary().numDocs++;

            let uuid = DcatapdeMapper.select('./dct:identifier', records[i], true).textContent;
            if(!uuid) {
                uuid = DcatapdeMapper.select('./dct:identifier/@rdf:resource', records[i], true).textContent;
            }
            if (!this.filterUtils.isIdAllowed(uuid)) {
                this.getSummary().skippedDocs.push(uuid);
                continue;
            }

            if (log.isDebugEnabled()) {
                log.debug(`Import document ${i + 1} from ${records.length}`);
            }
            if (logRequest.isDebugEnabled()) {
                logRequest.debug("Record content: ", records[i].toString());
            }

            let mapper = new DcatapdeMapper(this.getSettings(), records[i], harvestTime, this.getSummary());
            let documentFactory = ProfileFactoryLoader.get().getDocumentFactory(mapper);

            let doc: IndexDocument;
            let dcatapdeDoc: string;
            try {
                doc = await documentFactory.createIndexDocument();
                dcatapdeDoc = documentFactory.createDcatapdeDocument();
            }
            catch (e) {
                log.error('Error creating index document', e);
                this.getSummary().errors.push({ type: 'app', error: e.toString() });
                mapper.skipped = true;
            }

            if (!this.getSettings().dryRun && !mapper.shouldBeSkipped()) {
                let entity: RecordEntity = {
                    identifier: uuid,
                    source: this.getSettings().sourceURL,
                    collection_id: (await this.database.getLegacyCatalog(this.getSettings().catalogId)).id,
                    catalog_ids: this.getSettings().catalogIds,
                    dataset: doc,
                    dataset_dcatapde: dcatapdeDoc,
                    original_document: mapper.getHarvestedData()
                };
                promises.push(
                    this.database.addEntityToBulk(entity)
                        .then(response => {
                            if (!response.queued) {
                                // numIndexDocs += ElasticsearchUtils.maxBulkSize;
                                // this.observer.next(ImportResult.running(numIndexDocs, records.length));
                            }
                        })
                );
            } else {
                this.getSummary().skippedDocs.push(uuid);
            }
            this.observer.next(this.getSummary().msgRunning(++this.numIndexDocs, this.totalRecords, this.getDownloadMessage()));
        }
        await Promise.all(promises)
            .catch(err => log.error('Error indexing DCAT record', err));
    }

    static createRequestConfig(settings: DcatapdeSettings): RequestOptions {
        let requestConfig: RequestOptions = {
            method: "GET",
            uri: settings.sourceURL,
            json: false,
            proxy: settings.proxy || null,
            rejectUnauthorized: settings.rejectUnauthorizedSSL,
            timeout: settings.timeout
        };
        return requestConfig;
    }


}
