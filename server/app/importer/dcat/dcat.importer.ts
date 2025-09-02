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

import * as MiscUtils from '../../utils/misc.utils.js';
import { getLogger } from 'log4js';
import { namespaces } from '../../importer/namespaces.js';
import { DcatMapper } from './dcat.mapper.js';
import { DcatSettings, defaultDCATSettings } from './dcat.settings.js';
import { DOMParser } from '@xmldom/xmldom';
import { Importer } from '../importer.js';
import { ImportLogMessage, ImportResult } from '../../model/import.result.js';
import { IndexDocument } from '../../model/index.document.js';
import { Observer } from 'rxjs';
import { ProfileFactory } from '../../profiles/profile.factory.js';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader.js';
import { RecordEntity } from '../../model/entity.js';
import { RequestDelegate, RequestOptions } from '../../utils/http-request.utils.js';
import { Summary } from '../../model/summary.js';

const log = getLogger(__filename);
const logRequest = getLogger('requests');

export class DcatImporter extends Importer {

    protected domParser: DOMParser;
    protected profile: ProfileFactory<DcatMapper>;
    protected requestDelegate: RequestDelegate;
    protected settings: DcatSettings;

    private totalRecords = 0;
    private numIndexDocs = 0;

    constructor(settings, requestDelegate?: RequestDelegate) {
        super(settings);

        this.profile = ProfileFactoryLoader.get();
        this.domParser = MiscUtils.getDomParser();

        // merge default settings with configured ones
        settings = MiscUtils.merge(defaultDCATSettings, settings);

        if (requestDelegate) {
            this.requestDelegate = requestDelegate;
        } else {
            let requestConfig = DcatImporter.createRequestConfig(settings);
            this.requestDelegate = new RequestDelegate(requestConfig, DcatImporter.createPaging(settings));
        }
        this.settings = settings;
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
                let itemsPerPage = parseInt(DcatMapper.select('./hydra:itemsPerPage', pagedCollection, true).textContent);
                this.totalRecords = parseInt(DcatMapper.select('./hydra:totalItems', pagedCollection, true).textContent);

                let thisPageUrl = pagedCollection.getAttribute('rdf:about');

                let thisPage = Number(DcatImporter.getPageFromUrl(thisPageUrl));

                let lastPage = this.totalRecords/itemsPerPage;
                let lastPageUrlElement = DcatMapper.select('./hydra:lastPage', pagedCollection, true);
                if(lastPageUrlElement){
                    let lastPageUrl = lastPageUrlElement.textContent;
                    lastPage = Number(DcatImporter.getPageFromUrl(lastPageUrl));
                }

                isLastPage = thisPage >= lastPage;
                if(!isLastPage){
                    let nextPageUrl = DcatMapper.select('./hydra:nextPage', pagedCollection, true).textContent;
                    let nextPage = Number(DcatImporter.getPageFromUrl(nextPageUrl));
                    this.requestDelegate.updateConfig({qs: {page: nextPage}});
                }

                log.debug(`Received ${numReturned} records from ${this.settings.sourceURL} - Page: ${thisPage}`);
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
                    this.summary.appErrors.push(message);
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
        let records =  DcatMapper.select('./dcat:Catalog/dcat:dataset/dcat:Dataset|./dcat:Dataset', rootNode);

        let ids = [];
        for (let i = 0; i < records.length; i++) {
            let uuid = DcatMapper.select('./dct:identifier', records[i], true).textContent;
            if(!uuid) {
                uuid = DcatMapper.select('./dct:identifier/@rdf:resource', records[i], true).textContent;
            }
            ids.push(uuid);
        }

        for (let i = 0; i < records.length; i++) {
            this.summary.numDocs++;

            let uuid = DcatMapper.select('./dct:identifier', records[i], true).textContent;
            if(!uuid) {
                uuid = DcatMapper.select('./dct:identifier/@rdf:resource', records[i], true).textContent;
            }
            if (!this.filterUtils.isIdAllowed(uuid)) {
                this.summary.skippedDocs.push(uuid);
                continue;
            }

            if (log.isDebugEnabled()) {
                log.debug(`Import document ${i + 1} from ${records.length}`);
            }
            if (logRequest.isDebugEnabled()) {
                logRequest.debug("Record content: ", records[i].toString());
            }

            let mapper = this.getMapper(this.settings, records[i], rootNode, harvestTime, this.summary);

            let doc: IndexDocument;
            try {
                doc = await this.profile.getIndexDocumentFactory(mapper).create();
            }
            catch (e) {
                log.error('Error creating index document', e);
                this.summary.appErrors.push(e.toString());
                mapper.skipped = true;
            }

            if (!this.settings.dryRun && !mapper.shouldBeSkipped()) {
                let entity: RecordEntity = {
                    identifier: uuid,
                    source: this.settings.sourceURL,
                    collection_id: (await this.database.getCatalog(this.settings.catalogId)).id,
                    dataset: doc,
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
                this.summary.skippedDocs.push(uuid);
            }
            this.observer.next(ImportResult.running(++this.numIndexDocs, this.totalRecords));
        }
        await Promise.all(promises)
            .catch(err => log.error('Error indexing DCAT record', err));
    }

    getMapper(settings, record, catalogPage, harvestTime, summary): DcatMapper {
        return new DcatMapper(settings, record, catalogPage, harvestTime, summary);
    }

    static createRequestConfig(settings: DcatSettings): RequestOptions {
        let requestConfig: RequestOptions = {
            method: "GET",
            uri: settings.sourceURL,
            json: false,
            proxy: settings.proxy || null,
            rejectUnauthorized: settings.rejectUnauthorizedSSL,
            timeout: settings.timeout
        };
/*
        requestConfig.qs = {
            page: 1
        };
*/
        return requestConfig;
    }

    static createPaging(settings: DcatSettings) {
        return {
            startFieldName: 'page',
            startPosition: settings.startPosition,
            numRecords: settings.maxRecords
        }
    }

    getSummary(): Summary {
        return this.summary;
    }

    private static getPageFromUrl(url: string) {
        let pos = url.indexOf('page=')
        if (pos !== -1) {
            url = url.substr(pos + 5);
            let endPos = url.indexOf('&')
            if(endPos > -1){
                url = url.substr(0, endPos);
            }
            return url;
        }
        return undefined;
    }
}
