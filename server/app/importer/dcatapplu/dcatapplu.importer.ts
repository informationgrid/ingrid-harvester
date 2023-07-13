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

import {DcatappluMapper} from './dcatapplu.mapper';
import {Summary} from '../../model/summary';
import {getLogger} from 'log4js';

import {Importer} from '../importer';
import {Observer} from 'rxjs';
import {ImportLogMessage, ImportResult} from '../../model/import.result';
import {DcatappluSettings, defaultDCATAPPLUSettings} from './dcatapplu.settings';
import {RequestDelegate, RequestOptions} from "../../utils/http-request.utils";
import { MiscUtils } from '../../utils/misc.utils';
import {ProfileFactory} from "../../profiles/profile.factory";
import {ProfileFactoryLoader} from "../../profiles/profile.factory.loader";
import { Catalog } from 'model/dcatApPlu.model';
import { DcatApPluDocument } from 'profiles/diplanung/model/dcatApPlu.document';

let log = require('log4js').getLogger(__filename),
    logSummary = getLogger('summary'),
    logRequest = getLogger('requests'),
    DomParser = require('@xmldom/xmldom').DOMParser;

export class DcatappluImporter extends Importer {
    private profile: ProfileFactory<DcatappluMapper>;
    private readonly settings: DcatappluSettings;
    private readonly requestDelegate: RequestDelegate;

    private totalRecords = 0;
    private numIndexDocs = 0;


    constructor(settings, requestDelegate?: RequestDelegate) {
        super(settings);

        this.profile = ProfileFactoryLoader.get();

        // merge default settings with configured ones
        settings = MiscUtils.merge(defaultDCATAPPLUSettings, settings);

        if (requestDelegate) {
            this.requestDelegate = requestDelegate;
        } else {
            let requestConfig = DcatappluImporter.createRequestConfig(settings);
            this.requestDelegate = new RequestDelegate(requestConfig, DcatappluImporter.createPaging(settings));
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
                await this.elastic.prepareIndex(this.profile.getIndexMappings(), this.profile.getIndexSettings());
                await this.harvest();
                await this.elastic.sendBulkData(false);
                await this.elastic.finishIndex();
                observer.next(ImportResult.complete(this.summary));
                observer.complete();

            } catch (err) {
                this.summary.appErrors.push(err.message ? err.message : err);
                log.error('Error during DCATAPPLU import', err);
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

            let pagedCollection = responseDom.getElementsByTagNameNS(DcatappluMapper.HYDRA, 'PagedCollection')[0];
            if (pagedCollection) {
                retries = 0;

                let numReturned = responseDom.getElementsByTagNameNS(DcatappluMapper.DCAT, 'Dataset').length;
                let itemsPerPage = DcatappluMapper.select('./hydra:itemsPerPage', pagedCollection, true).textContent;
                this.totalRecords = DcatappluMapper.select('./hydra:totalItems', pagedCollection, true).textContent;

                let thisPageUrl = pagedCollection.getAttribute('rdf:about');

                let thisPage = Number(DcatappluImporter.getPageFromUrl(thisPageUrl));

                let lastPage = this.totalRecords/itemsPerPage;
                let lastPageUrlElement = DcatappluMapper.select('./hydra:lastPage', pagedCollection, true);
                if(lastPageUrlElement){
                    let lastPageUrl = lastPageUrlElement.textContent;
                    lastPage = Number(DcatappluImporter.getPageFromUrl(lastPageUrl));
                }


                isLastPage = thisPage >= lastPage;
                if(!isLastPage){
                    let nextPageUrl = DcatappluMapper.select('./hydra:nextPage', pagedCollection, true).textContent;
                    let nextPage = Number(DcatappluImporter.getPageFromUrl(nextPageUrl));
                    this.requestDelegate.updateConfig({qs: {page: nextPage}});
                }

                log.debug(`Received ${numReturned} records from ${this.settings.catalogUrl} - Page: ${thisPage}`);
                await this.extractRecords(response, harvestTime)
            } else {
                let numReturned = responseDom.getElementsByTagNameNS(DcatappluMapper.DCAT, 'Dataset').length;
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
        let rootNode = xml.getElementsByTagNameNS(DcatappluMapper.RDF, 'RDF')[0];
        // let records =  DcatappluMapper.select('./dcat:Catalog/dcat:dataset/dcat:Dataset|./dcat:Dataset', rootNode);
        let records =  DcatappluMapper.select('./dcat:Dataset', rootNode);

        let catalogs = DcatappluMapper.select('./dcat:Catalog', rootNode);
        let catalogAboutsToCatalogs = {};
        let datasetAboutsToCatalogAbouts = {};

        catalogs.forEach((catalogElement) => {
            let catalogAbout = DcatappluMapper.select('./@rdf:about', catalogElement, true)?.textContent;
            let catalog: Catalog = {
                title:  DcatappluMapper.select('./dct:title', catalogElement, true)?.textContent ?? "",
                description: DcatappluMapper.select('./dct:description', catalogElement, true)?.textContent ?? "",
                homepage: DcatappluMapper.select('./foaf:homepage/@rdf:resource', catalogElement, true)?.textContent,
                identifier: DcatappluMapper.select('./dct:identifier', catalogElement, true)?.textContent,
                issued: DcatappluMapper.select('./dct:issued', catalogElement, true)?.textContent,
                language: DcatappluMapper.select('./dct:language/@rdf:resource', catalogElement, true)?.textContent,
                modified: DcatappluMapper.select('./dct:modified', catalogElement, true)?.textContent,
                publisher: {
                    name: DcatappluMapper.select('./dct:publisher/foaf:Agent/foaf:name', catalogElement, true)?.textContent ?? undefined,
                    type: DcatappluMapper.select('./dct:publisher/foaf:Agent/dct:type', catalogElement, true)?.textContent ?? undefined
                },
                themeTaxonomy: DcatappluMapper.select('./dcat:themeTaxonomy/skos:ConceptScheme/dct:title', catalogElement, true)?.textContent,
                // records?: Record[],
            };
            catalogAboutsToCatalogs[catalogAbout] = catalog;
            let catalogDatasets = DcatappluMapper.select('./dcat:dataset', catalogElement);
            catalogDatasets.forEach((datasetElement) => {
                let datasetAbout = DcatappluMapper.select('./@rdf:resource', datasetElement, true)?.textContent;
                datasetAboutsToCatalogAbouts[datasetAbout] =  catalogAbout
            });
        })

        let ids = [];
        for (let i = 0; i < records.length; i++) {
            let uuid = DcatappluMapper.select('./dct:identifier', records[i], true).textContent;
            if(!uuid) {
                uuid = DcatappluMapper.select('./dct:identifier/@rdf:resource', records[i], true).textContent;
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

            let uuid = DcatappluMapper.select('./dct:identifier', records[i], true).textContent;
            if(!uuid) {
                uuid = DcatappluMapper.select('./dct:identifier/@rdf:resource', records[i], true).textContent;
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

            let rdfAboutAttribute = DcatappluMapper.select('./@rdf:about', records[i], true)?.textContent;
            let catalogId = datasetAboutsToCatalogAbouts[rdfAboutAttribute];
            let catalog = catalogAboutsToCatalogs[catalogId];
            let mapper = this.getMapper(this.settings, records[i], catalog, rootNode, harvestTime, storedData[i], this.summary);

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
                                    // numIndexDocs += ElasticsearchUtils.maxBulkSize;
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

    getMapper(settings, record, catalog, catalogPage, harvestTime, storedData, summary): DcatappluMapper {
        return new DcatappluMapper(settings, record, catalog, catalogPage, harvestTime, storedData, summary);
    }

    static createRequestConfig(settings: DcatappluSettings): RequestOptions {
        let requestConfig: RequestOptions = {
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

    static createPaging(settings: DcatappluSettings) {
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
