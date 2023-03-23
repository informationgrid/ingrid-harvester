/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
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

import {DcatMapper} from './dcat.mapper';
import {Summary} from '../../model/summary';
import {getLogger} from 'log4js';
import {OptionsWithUri} from 'request-promise';
import {Importer} from '../importer';
import {Observer} from 'rxjs';
import {ImportLogMessage, ImportResult} from '../../model/import.result';
import {DcatSettings, defaultDCATSettings} from './dcat.settings';
import {RequestDelegate} from "../../utils/http-request.utils";
import { MiscUtils } from '../../utils/misc.utils';
import {ProfileFactory} from "../../profiles/profile.factory";
import {ProfileFactoryLoader} from "../../profiles/profile.factory.loader";

let log = require('log4js').getLogger(__filename),
    logSummary = getLogger('summary'),
    logRequest = getLogger('requests'),
    DomParser = require('@xmldom/xmldom').DOMParser;

export class DcatImporter extends Importer {
    private profile: ProfileFactory<DcatMapper>;
    private readonly settings: DcatSettings;
    private readonly requestDelegate: RequestDelegate;

    private totalRecords = 0;
    private numIndexDocs = 0;


    constructor(settings, requestDelegate?: RequestDelegate) {
        super(settings);

        this.profile = ProfileFactoryLoader.get();

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

    async exec(observer: Observer<ImportLogMessage>): Promise<void> {
        if (this.settings.dryRun) {
            log.debug('Dry run option enabled. Skipping index creation.');
            await this.harvest();
            log.debug('Skipping finalisation of index for dry run.');
            observer.next(ImportResult.complete(this.summary, 'Dry run ... no indexing of data'));
            observer.complete();
        } else {
            try {
                await this.elastic.prepareIndex(this.profile.getElasticMapping(), this.profile.getElasticSettings());
                await this.harvest();
                await this.elastic.sendBulkData(false);
                await this.elastic.finishIndex();
                observer.next(ImportResult.complete(this.summary));
                observer.complete();

            } catch (err) {
                this.summary.appErrors.push(err.message ? err.message : err);
                log.error('Error during DCAT import', err);
                observer.next(ImportResult.complete(this.summary, 'Error happened'));
                observer.complete();

                // clean up index
                this.elastic.deleteIndex(this.elastic.indexName);
            }
        }
    }

    async harvest() {
        let retries = 0;

        while (true) {
            log.debug('Requesting next records');
            let response = await this.requestDelegate.doRequest();
            let harvestTime = new Date(Date.now());

            let responseDom = new DomParser().parseFromString(response);

            let isLastPage = false;

            let pagedCollection = responseDom.getElementsByTagNameNS(DcatMapper.HYDRA, 'PagedCollection')[0];
            if (pagedCollection) {
                retries = 0;

                let numReturned = responseDom.getElementsByTagNameNS(DcatMapper.DCAT, 'Dataset').length;
                let itemsPerPage = DcatMapper.select('./hydra:itemsPerPage', pagedCollection, true).textContent;
                this.totalRecords = DcatMapper.select('./hydra:totalItems', pagedCollection, true).textContent;

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

                log.debug(`Received ${numReturned} records from ${this.settings.catalogUrl} - Page: ${thisPage}`);
                await this.extractRecords(response, harvestTime)
            } else {
                let numReturned = responseDom.getElementsByTagNameNS(DcatMapper.DCAT, 'Dataset').length;
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

    }

    async extractRecords(getRecordsResponse, harvestTime) {
        let promises = [];
        let xml = new DomParser().parseFromString(getRecordsResponse, 'application/xml');
        let rootNode = xml.getElementsByTagNameNS(DcatMapper.RDF, 'RDF')[0];
        let records =  DcatMapper.select('./dcat:Catalog/dcat:dataset/dcat:Dataset|./dcat:Dataset', rootNode);


        let ids = [];
        for (let i = 0; i < records.length; i++) {
            let uuid = DcatMapper.select('./dct:identifier', records[i], true).textContent;
            if(!uuid) {
                uuid = DcatMapper.select('./dct:identifier/@rdf:resource', records[i], true).textContent;
            }
            ids.push(uuid);

        }

        let now = new Date(Date.now());
        let storedData;

        if (this.settings.dryRun) {
            storedData = ids.map(() => now);
        } else {
            storedData = await this.elastic.getStoredData(ids);
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

            let mapper = this.getMapper(this.settings, records[i], rootNode, harvestTime, storedData[i], this.summary);

            let doc: any = await this.profile.getIndexDocument().create(mapper).catch(e => {
                log.error('Error creating index document', e);
                this.summary.appErrors.push(e.toString());
                mapper.skipped = true;
            });

            if (!mapper.shouldBeSkipped()) {
                if (!this.settings.dryRun) {
                    promises.push(
                        this.elastic.addDocToBulk(doc, uuid)
                            .then(response => {
                                if (!response.queued) {
                                    // numIndexDocs += ElasticSearchUtils.maxBulkSize;
                                    // this.observer.next(ImportResult.running(numIndexDocs, records.length));
                                }
                            })
                    );
                }

            } else {
                this.summary.skippedDocs.push(uuid);
            }
            this.observer.next(ImportResult.running(++this.numIndexDocs, this.totalRecords));
        }
        await Promise.all(promises)
            .catch(err => log.error('Error indexing DCAT record', err));
    }

    getMapper(settings, record, catalogPage, harvestTime, storedData, summary): DcatMapper {
        return new DcatMapper(settings, record, catalogPage, harvestTime, storedData, summary);
    }

    static createRequestConfig(settings: DcatSettings): OptionsWithUri {
        let requestConfig: OptionsWithUri = {
            method: "GET",
            uri: settings.catalogUrl,
            json: false,
            proxy: settings.proxy || null
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
