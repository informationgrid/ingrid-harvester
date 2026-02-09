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
import type { Catalog } from '../../model/dcatApPlu.model.js';
import type { RecordEntity } from '../../model/entity.js';
import type { ImportLogMessage } from '../../model/import.result.js';
import { ImportResult } from '../../model/import.result.js';
import type { IndexDocument } from '../../model/index.document.js';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader.js';
import type { RequestOptions } from '../../utils/http-request.utils.js';
import { RequestDelegate } from '../../utils/http-request.utils.js';
import * as MiscUtils from '../../utils/misc.utils.js';
import { Importer } from '../importer.js';
import { DcatappluMapper } from './dcatapplu.mapper.js';
import type { DcatappluSettings } from './dcatapplu.settings.js';
import { defaultDCATAPPLUSettings } from './dcatapplu.settings.js';

const log = log4js.getLogger(import.meta.filename);
const logRequest = log4js.getLogger('requests');

export class DcatappluImporter extends Importer<DcatappluSettings> {

    protected domParser: DOMParser;
    protected requestDelegate: RequestDelegate;

    private totalRecords = 0;
    private numIndexDocs = 0;

    constructor(settings: DcatappluSettings, requestDelegate?: RequestDelegate) {
        // merge default settings with configured ones
        settings = MiscUtils.merge(defaultDCATAPPLUSettings, settings);
        super(settings);

        this.domParser = MiscUtils.getDomParser();

        if (requestDelegate) {
            this.requestDelegate = requestDelegate;
        } else {
            let requestConfig = DcatappluImporter.createRequestConfig(settings);
            this.requestDelegate = new RequestDelegate(requestConfig, DcatappluImporter.createPaging(settings));
        }
    }

    // only here for documentation - use the "default" exec function
    async exec(observer: Observer<ImportLogMessage>): Promise<void> {
        await super.exec(observer);
    }

    protected async harvest(): Promise<number> {
        // let retries = 0;

        // while (true) {
            log.debug('Requesting next records');
            let response = await this.requestDelegate.doRequest();
            let harvestTime = new Date(Date.now());

            // let responseDom = this.domParser.parseFromString(response);

            // let isLastPage = false;

            // let pagedCollection = responseDom.getElementsByTagNameNS(namespaces.HYDRA, 'PagedCollection')[0];
            // if (pagedCollection) {
            //     retries = 0;

            //     let numReturned = responseDom.getElementsByTagNameNS(namespaces.DCAT, 'Dataset').length;
            //     let itemsPerPage = DcatappluMapper.select('./hydra:itemsPerPage', pagedCollection, true).textContent;
            //     this.totalRecords = DcatappluMapper.select('./hydra:totalItems', pagedCollection, true).textContent;

            //     let thisPageUrl = pagedCollection.getAttribute('rdf:about');

            //     let thisPage = Number(DcatappluImporter.getPageFromUrl(thisPageUrl));

            //     let lastPage = this.totalRecords/itemsPerPage;
            //     let lastPageUrlElement = DcatappluMapper.select('./hydra:lastPage', pagedCollection, true);
            //     if(lastPageUrlElement){
            //         let lastPageUrl = lastPageUrlElement.textContent;
            //         lastPage = Number(DcatappluImporter.getPageFromUrl(lastPageUrl));
            //     }


            //     isLastPage = thisPage >= lastPage;
            //     if(!isLastPage){
            //         let nextPageUrl = DcatappluMapper.select('./hydra:nextPage', pagedCollection, true).textContent;
            //         let nextPage = Number(DcatappluImporter.getPageFromUrl(nextPageUrl));
            //         this.requestDelegate.updateConfig({qs: {page: nextPage}});
            //     }

            //     log.debug(`Received ${numReturned} records from ${this.settings.sourceURL} - Page: ${thisPage}`);
                await this.extractRecords(response, harvestTime);
            // }
            // else {
            //     let numReturned = responseDom.getElementsByTagNameNS(namespaces.DCAT, 'Dataset').length;
            //     if(numReturned > 0){
            //         await this.extractRecords(response, harvestTime);
            //         isLastPage = true;
            //     } else {
            //         const message = `Error while fetching DCAT Records. Will continue to try and fetch next records, if any.\nServer response: ${MiscUtils.truncateErrorMessage(responseDom.toString())}.`;
            //         log.error(message);
            //         this.summary.appErrors.push(message);
            //         if(retries++ > 3){
            //             isLastPage = true;
            //             log.error('Stopped after 3 Retries')
            //         }
            //     }
            // }
            // if (isLastPage) {
            //     break;
            // }
        // }
        // send leftovers
        await this.database.sendBulkData();

        return this.numIndexDocs;
    }

    async extractRecords(ogcApiResponse, harvestTime) {
        let promises = [];

        let dcatApPluDocuments = ogcApiResponse?.map(obj => obj.dcat_ap_plu);
        for (let dcatApPluDocument of dcatApPluDocuments) {
            let xml = this.domParser.parseFromString(dcatApPluDocument, 'application/xml');
            let rootNode = xml.getElementsByTagNameNS(namespaces.RDF, 'RDF')[0];
            // let records =  DcatappluMapper.select('./dcat:Catalog/dcat:dataset/dcat:Dataset|./dcat:Dataset', rootNode);
            let records =  DcatappluMapper.select('./dcat:Catalog/dcat:dataset/dcat:Dataset|./dcat:Dataset', rootNode);

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
                    datasetAboutsToCatalogAbouts[datasetAbout] =  catalogAbout;
                });
            });

            for (let i = 0; i < records.length; i++) {
                this.getSummary().numDocs++;

                let uuid = DcatappluMapper.select('./dct:identifier', records[i], true).textContent;
                if (!uuid) {
                    uuid = DcatappluMapper.select('./dct:identifier/@rdf:resource', records[i], true).textContent;
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

                let rdfAboutAttribute = DcatappluMapper.select('./@rdf:about', records[i], true)?.textContent;
                let catalogId = datasetAboutsToCatalogAbouts[rdfAboutAttribute];
                let catalog = catalogAboutsToCatalogs[catalogId] ?? this.database.getCatalog(this.generalConfig.elasticsearch.index);
                if (!catalog) {
                    catalog = await this.database.createCatalog({
                        description: 'Globaler Katalog',
                        identifier: this.generalConfig.elasticsearch.index,
                        publisher: {
                            name: ''
                        },
                        title: 'Globaler Katalog'
                    });
                }
                let mapper = this.getMapper(this.getSettings(), records[i], catalog, rootNode, harvestTime, this.getSummary());

                let doc: IndexDocument;
                try {
                    doc = await ProfileFactoryLoader.get().getIndexDocumentFactory(mapper).create();
                }
                catch (e) {
                    log.error('Error creating index document', e);
                    this.getSummary().appErrors.push(e.toString());
                    mapper.skipped = true;
                }

                if (!this.getSettings().dryRun && !mapper.shouldBeSkipped()) {
                    let entity: RecordEntity = {
                        identifier: uuid,
                        source: this.getSettings().sourceURL,
                        collection_id: (await this.database.getCatalog(this.getSettings().catalogId)).id,
                        dataset: doc,
                        original_document: mapper.getHarvestedData()
                    };
                    promises.push(this.database.addEntityToBulk(entity));
                }
                else {
                    this.getSummary().skippedDocs.push(uuid);
                }
                this.observer.next(ImportResult.running(++this.numIndexDocs, this.totalRecords));
            }
        }
        await Promise.all(promises).catch(err => log.error('Error indexing DCAT record', err));
    }

    getMapper(settings, record, catalog, catalogPage, harvestTime, summary): DcatappluMapper {
        return new DcatappluMapper(settings, record, catalog, catalogPage, harvestTime, summary);
    }

    static createRequestConfig(settings: DcatappluSettings): RequestOptions {
        let requestConfig: RequestOptions = {
            method: "GET",
            uri: settings.sourceURL,
            json: true,
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

    static createPaging(settings: DcatappluSettings) {
        return {
            startFieldName: 'page',
            startPosition: settings.startPosition,
            numRecords: settings.maxRecords
        }
    }

    private static getPageFromUrl(url: string) {
        let pos = url.indexOf('page=');
        if (pos !== -1) {
            url = url.substr(pos + 5);
            let endPos = url.indexOf('&');
            if(endPos > -1){
                url = url.substr(0, endPos);
            }
            return url;
        }
        return undefined;
    }
}
