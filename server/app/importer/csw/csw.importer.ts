/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2021 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

import {DefaultElasticsearchSettings, ElasticSearchUtils} from '../../utils/elastic.utils';
import {elasticsearchMapping} from '../../elastic.mapping';
import {elasticsearchSettings} from '../../elastic.settings';
import {IndexDocument} from '../../model/index.document';
import {CswMapper} from './csw.mapper';
import {Summary} from '../../model/summary';
import {getLogger} from 'log4js';
import {CswParameters, RequestDelegate} from '../../utils/http-request.utils';
import {OptionsWithUri} from 'request-promise';
import {DefaultImporterSettings, Importer} from '../../importer';
import {Observable, Observer} from 'rxjs';
import {ImportLogMessage, ImportResult} from '../../model/import.result';
import {DefaultXpathSettings, CswSettings} from './csw.settings';
import {FilterUtils} from "../../utils/filter.utils";
import { SummaryService } from '../../services/config/SummaryService';

const fs = require('fs');
const merge = require('lodash/merge');
const xpath = require('xpath');

let log = require('log4js').getLogger(__filename),
    logSummary = getLogger('summary'),
    logRequest = getLogger('requests'),
    DomParser = require('xmldom').DOMParser;

export class CswSummary extends Summary {
    additionalSummary() {
        logSummary.info(`Number of records with at least one mandatory keyword: ${this.opendata}`);
        logSummary.info(`Number of records with missing links: ${this.missingLinks}`);
        logSummary.info(`Number of records with missing license: ${this.missingLicense}`);
        logSummary.info(`Number of records with missing publishers: ${this.missingPublishers}`);
        logSummary.info(`Number of records imported as valid: ${this.ok}`);
    }
}

export class CswImporter implements Importer {
    private readonly settings: CswSettings;
    elastic: ElasticSearchUtils;
    private readonly requestDelegate: RequestDelegate;

    private totalRecords = 0;
    private numIndexDocs = 0;

    static defaultSettings: Partial<CswSettings> = {
        ...DefaultElasticsearchSettings,
        ...DefaultImporterSettings,
        ...DefaultXpathSettings,
        getRecordsUrl: '',
        eitherKeywords: [],
        httpMethod: 'GET',
        resultType: 'results'
    };

    private readonly summary: CswSummary;
    private filterUtils: FilterUtils;
    private generalInfo: object = {};

    run = new Observable<ImportLogMessage>(observer => {
        this.observer = observer;
        this.exec(observer);
    });

    private observer: Observer<ImportLogMessage>;

    constructor(settings, requestDelegate?: RequestDelegate) {
        // merge default settings with configured ones
        settings = merge(CswImporter.defaultSettings, settings);

        // if we are looking for incremental updates, add a date filter to the existing record filter
        if (settings.isIncremental) {
            let sumser: SummaryService = new SummaryService();
            let summary: ImportLogMessage = sumser.get(settings.id);
            settings.recordFilter = CswImporter.addModifiedFilter(settings.recordFilter, summary.lastExecution);
        }

        // TODO check settings for "//" in xpaths and disallow them for performance reasons
        // TODO also disallow setting them in the UI

        if (requestDelegate) {
            this.requestDelegate = requestDelegate;
        } else {
            let requestConfig = CswImporter.createRequestConfig(settings);
            this.requestDelegate = new RequestDelegate(requestConfig, CswImporter.createPaging(settings));
        }

        this.settings = settings;
        this.filterUtils = new FilterUtils(settings);

        this.summary = new CswSummary(settings);

        this.elastic = new ElasticSearchUtils(settings, this.summary);
    }

    static addModifiedFilter(recordFilter: string, lastRunDate: Date): string {
        let incrementalFilter = new DomParser().parseFromString(`<ogc:PropertyIsGreaterThanOrEqualTo><ogc:PropertyName>Modified</ogc:PropertyName><ogc:Literal>${lastRunDate.toISOString()}</ogc:Literal></ogc:PropertyIsGreaterThanOrEqualTo>`);
        if (recordFilter != '') {
            recordFilter = recordFilter.replace('<ogc:Filter>', '<ogc:And>');
            recordFilter = recordFilter.replace('</ogc:Filter>', '</ogc:And>');
            let andElem = new DomParser().parseFromString(recordFilter);
            andElem.documentElement.appendChild(incrementalFilter);
            incrementalFilter = andElem;
        }
        let modifiedFilter = new DomParser().parseFromString('<ogc:Filter/>');
        modifiedFilter.documentElement.appendChild(incrementalFilter);
        return modifiedFilter.toString().replace(' xmlns:ogc=""', '');
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
                await this.elastic.prepareIndex(elasticsearchMapping, elasticsearchSettings);
                await this.harvest();
                if(this.numIndexDocs > 0) {
                    await this.elastic.sendBulkData(false);
                    await this.elastic.finishIndex();
                    observer.next(ImportResult.complete(this.summary));
                    observer.complete();
                } else {
                    if(this.summary.appErrors.length === 0) {
                        this.summary.appErrors.push('No Results');
                    }
                    log.error('No results during CSW import - Keep old index');
                    observer.next(ImportResult.complete(this.summary, 'No Results - Keep old index'));
                    observer.complete();

                    // clean up index
                    this.elastic.deleteIndex(this.elastic.indexName);
                }
            } catch (err) {
                this.summary.appErrors.push(err.message ? err.message : err);
                log.error('Error during CSW import', err);
                observer.next(ImportResult.complete(this.summary, 'Error happened'));
                observer.complete();

                // clean up index
                this.elastic.deleteIndex(this.elastic.indexName);
            }
        }
    }

    async harvest(): Promise<void> {
        if (this.settings.isConcurrent) {
            return this.harvestConcurrently();
        }
        else {
            return this.harvestSequentially();
        }
    }

    async handleHarvest(delegate: RequestDelegate): Promise<void> {
        log.debug('Requesting next records');
        let response = await delegate.doRequest();
        let harvestTime = new Date(Date.now());

        let responseDom = new DomParser().parseFromString(response);
        let resultsNode = responseDom.getElementsByTagNameNS(CswMapper.CSW, 'SearchResults')[0];
        if (resultsNode) {
            let numReturned = resultsNode.getAttribute('numberOfRecordsReturned');
            // this.totalRecords = resultsNode.getAttribute('numberOfRecordsMatched');

            log.debug(`Received ${numReturned} records from ${this.settings.getRecordsUrl}`);
            await this.extractRecords(response, harvestTime)
        } else {
            const message = `Error while fetching CSW Records. Will continue to try and fetch next records, if any.\nServer response: ${responseDom.toString()}.`;
            log.error(message);
            this.summary.appErrors.push(message);
        }
    }

    async harvestConcurrently() {

        let capabilitiesRequestConfig = CswImporter.createRequestConfig({ ...this.settings, httpMethod: 'GET' }, 'GetCapabilities');
        let capabilitiesRequestDelegate = new RequestDelegate(capabilitiesRequestConfig);
        let capabilitiesResponse = await capabilitiesRequestDelegate.doRequest();
        let capabilitiesResponseDom = new DomParser().parseFromString(capabilitiesResponse);

        // store catalog info from getCapabilities in generalInfo
        this.generalInfo['catalog'] = {
            description: CswMapper.select(this.settings.xpaths.capabilities.abstract, capabilitiesResponseDom, true)?.textContent,
            homepage: this.settings.getRecordsUrl,
            publisher: [{ name: CswMapper.select(this.settings.xpaths.capabilities.serviceProvider + '/ows:ProviderName', capabilitiesResponseDom, true)?.textContent }],
            title: CswMapper.select(this.settings.xpaths.capabilities.title, capabilitiesResponseDom, true)?.textContent
        };

        // collect number of totalRecords up front, so we can harvest concurrently
        let hitsRequestConfig = CswImporter.createRequestConfig({ ...this.settings, resultType: 'hits' });
        let hitsRequestDelegate = new RequestDelegate(hitsRequestConfig, CswImporter.createPaging(this.settings));
        let hitsResponse = await hitsRequestDelegate.doRequest();
        let hitsResponseDom = new DomParser().parseFromString(hitsResponse);
        let hitsResultsNode = hitsResponseDom.getElementsByTagNameNS(CswMapper.CSW, 'SearchResults')[0];
        this.totalRecords = parseInt(hitsResultsNode.getAttribute('numberOfRecordsMatched'));

        // --------------
        
        // 1) create paged request delegates
        let handlers: Promise<void>[] = [];
        for (let startPosition = this.settings.startPosition; startPosition < this.totalRecords; startPosition += this.settings.maxRecords) {
            let requestConfig = CswImporter.createRequestConfig({ ...this.settings, startPosition });
            let delegate = new RequestDelegate(requestConfig);
            handlers.push(this.handleHarvest(delegate));
        }
        // 2) run in parallel
        // TODO limit how many run at the same time
        // let pro = await Promise.allSettled(delegates.map(delegate => this.handleHarvest(delegate)));
        await Promise.allSettled(handlers).then(result => console.log('done: ' + result));

        // --------------
        this.createDataServiceCoupling();
    }

    async harvestSequentially() {

        let capabilitiesRequestConfig = CswImporter.createRequestConfig({ ...this.settings, httpMethod: 'GET' }, 'GetCapabilities');
        let capabilitiesRequestDelegate = new RequestDelegate(capabilitiesRequestConfig);
        let capabilitiesResponse = await capabilitiesRequestDelegate.doRequest();
        let capabilitiesResponseDom = new DomParser().parseFromString(capabilitiesResponse);

        // // store catalog info from getCapabilities in generalInfo
        this.generalInfo['catalog'] = {
            description: CswMapper.select(this.settings.xpaths.capabilities.abstract, capabilitiesResponseDom, true)?.textContent,
            homepage: this.settings.getRecordsUrl,
            publisher: [{ name: CswMapper.select(this.settings.xpaths.capabilities.serviceProvider + '/ows:ProviderName', capabilitiesResponseDom, true)?.textContent }],
            title: CswMapper.select(this.settings.xpaths.capabilities.title, capabilitiesResponseDom, true)?.textContent
        };

        while (true) {
            log.debug('Requesting next records');
            let response = await this.requestDelegate.doRequest();
            let harvestTime = new Date(Date.now());

            let responseDom = new DomParser().parseFromString(response);
            let resultsNode = responseDom.getElementsByTagNameNS(CswMapper.CSW, 'SearchResults')[0];
            if (resultsNode) {
                let numReturned = resultsNode.getAttribute('numberOfRecordsReturned');
                this.totalRecords = resultsNode.getAttribute('numberOfRecordsMatched');

                log.debug(`Received ${numReturned} records from ${this.settings.getRecordsUrl}`);
                await this.extractRecords(response, harvestTime)
            } else {
                const message = `Error while fetching CSW Records. Will continue to try and fetch next records, if any.\nServer response: ${responseDom.toString()}.`;
                log.error(message);
                this.summary.appErrors.push(message);
            }
            this.requestDelegate.incrementStartRecordIndex();
            /*
              * startRecord was already incremented in the last step, so we can
              * directly use it to check if we need to continue.
              *
              * If there is a problem with the first request, then numMatched is
              * still 0. This will result in no records being harvested. If this
              * behaviour is not desired then the following check should be
              * updated. The easiest solution would be to set numMatched to
              * maxRecords * numRetries
              */
            if (this.totalRecords < this.requestDelegate.getStartRecordIndex()) break;
        }
        this.createDataServiceCoupling();
    }

    createDataServiceCoupling(){
        let bulkData = this.elastic._bulkData;
        let servicesByDataIdentifier = [];
        let servicesByFileIdentifier = [];
        for(let i = 0; i < bulkData.length; i++){
            let doc = bulkData[i];
            if(doc.extras){
                let harvestedData = doc.extras.harvested_data;
                let xml = new DomParser().parseFromString(harvestedData, 'application/xml');
                let identifierList = CswMapper.select('.//srv:coupledResource/srv:SV_CoupledResource/srv:identifier/gco:CharacterString', xml)
                if(identifierList && identifierList.length > 0){
                    for(let j = 0; j < identifierList.length; j++){
                        let identifer = identifierList[j].textContent;
                        if(!servicesByDataIdentifier[identifer]){
                            servicesByDataIdentifier[identifer] = [];
                        }
                        servicesByDataIdentifier[identifer] = servicesByDataIdentifier[identifer].concat(doc.distribution);
                    }
                } else {
                    identifierList = CswMapper.select('./gmd:identificationInfo/srv:SV_ServiceIdentification/srv:operatesOn', xml)
                    if (identifierList && identifierList.length > 0) {
                        for (let j = 0; j < identifierList.length; j++) {
                            let identifer = identifierList[j].getAttribute("uuidref")
                            if (!servicesByFileIdentifier[identifer]) {
                                servicesByFileIdentifier[identifer] = [];
                            }
                            servicesByFileIdentifier[identifer] = servicesByFileIdentifier[identifer].concat(doc.distribution);
                        }
                    }
                }
            }
        }

        for(let i = 0; i < bulkData.length; i++){
            let doc = bulkData[i];
            if(doc.extras){
                let harvestedData = doc.extras.harvested_data;
                let xml = new DomParser().parseFromString(harvestedData, 'application/xml');
                let identifierList = CswMapper.select('./gmd:identificationInfo/gmd:MD_DataIdentification/gmd:citation/gmd:CI_Citation/gmd:identifier/gmd:MD_Identifier/gmd:code/gco:CharacterString', xml)
                if(identifierList){
                    for(let j = 0; j < identifierList.length; j++){
                        let identifer = identifierList[j].textContent;
                        if(servicesByDataIdentifier[identifer]){
                            doc.distribution = doc.distribution.concat(servicesByDataIdentifier[identifer]);
                        }
                    }
                }
                identifierList = CswMapper.select('./gmd:fileIdentifier/gco:CharacterString', xml)
                if(identifierList){
                    for(let j = 0; j < identifierList.length; j++){
                        let identifer = identifierList[j].textContent;
                        if(servicesByFileIdentifier[identifer]){
                            doc.distribution = doc.distribution.concat(servicesByFileIdentifier[identifer]);
                        }
                    }
                }
            }
        }
    }

    async extractRecords(getRecordsResponse, harvestTime) {
        let promises = [];
        let xml = new DomParser().parseFromString(getRecordsResponse, 'application/xml');
        let records = xml.getElementsByTagNameNS(CswMapper.GMD, 'MD_Metadata');
        let ids = [];
        for (let i = 0; i < records.length; i++) {
            ids.push(CswMapper.getCharacterStringContent(records[i], 'fileIdentifier'));
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

            const uuid = CswMapper.getCharacterStringContent(records[i], 'fileIdentifier');
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

            let mapper = this.getMapper(this.settings, records[i], harvestTime, storedData[i], this.summary, this.generalInfo);

            let doc: any = await IndexDocument.create(mapper).catch(e => {
                log.error('Error creating index document', e);
                this.summary.appErrors.push(e.toString());
                mapper.skipped = true;
            });

            if (!mapper.shouldBeSkipped()) {

                if (doc.extras.metadata.isValid && doc.distribution.length > 0) {
                    this.summary.ok++;
                }

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
            .catch(err => log.error('Error indexing CSW record', err));
    }

    getMapper(settings, record, harvestTime, storedData, summary, generalInfo): CswMapper {
        return new CswMapper(settings, record, harvestTime, storedData, summary, generalInfo);
    }

    static createRequestConfig(settings: CswSettings, request = 'GetRecords'): OptionsWithUri {
        let requestConfig: OptionsWithUri = {
            method: settings.httpMethod || "GET",
            uri: settings.getRecordsUrl,
            json: false,
            headers: RequestDelegate.cswRequestHeaders(),
            proxy: settings.proxy || null
        };

        if (settings.httpMethod === "POST") {
            if (request === 'GetRecords') {
                requestConfig.body = `<?xml version="1.0" encoding="UTF-8"?>
                <GetRecords xmlns="http://www.opengis.net/cat/csw/2.0.2"
                            xmlns:gmd="http://www.isotc211.org/2005/gmd"
                            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                            xmlns:ogc="http://www.opengis.net/ogc"
                            xsi:schemaLocation="http://www.opengis.net/cat/csw/2.0.2"
                            service="CSW"
                            version="2.0.2"
                            resultType="${settings.resultType}"
                            outputFormat="application/xml"
                            outputSchema="http://www.isotc211.org/2005/gmd"
                            startPosition="${settings.startPosition}"
                            maxRecords="${settings.maxRecords}">
                    <DistributedSearch/>
                    <Query typeNames="gmd:MD_Metadata">
                        <ElementSetName typeNames="">full</ElementSetName>
                        ${settings.recordFilter ? `
                        <Constraint version=\"1.1.0\">
                            ${settings.recordFilter}
                        </Constraint>` : ''}
                    </Query>
                </GetRecords>`;
            }
            else {
                // TODO send GetCapabilities post request
            }
        } else {
            requestConfig.qs = <CswParameters>{
                request: request,
                SERVICE: 'CSW',
                VERSION: '2.0.2',
                resultType: settings.resultType,
                outputFormat: 'application/xml',
                outputSchema: 'http://www.isotc211.org/2005/gmd',
                typeNames: 'gmd:MD_Metadata',
                CONSTRAINTLANGUAGE: 'FILTER',
                startPosition: settings.startPosition,
                maxRecords: settings.maxRecords,
                CONSTRAINT_LANGUAGE_VERSION: '1.1.0',
                elementSetName: 'full'
            };
            if (settings.recordFilter) {
                requestConfig.qs.constraint = settings.recordFilter;
            }
        }

        return requestConfig;
    }

    static createPaging(settings: CswSettings) {
        return {
            startFieldName: 'startPosition',
            startPosition: settings.startPosition,
            numRecords: settings.maxRecords
        }
    }

    getSummary(): Summary {
        return this.summary;
    }

}
