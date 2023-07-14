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

import { defaultCSWSettings, CswSettings } from './csw.settings';
import { getLogger } from 'log4js';
import { namespaces } from '../../importer/namespaces';
import { BulkResponse } from 'persistence/elastic.utils';
import { Catalog } from '../../model/dcatApPlu.model';
import { ConfigService } from '../../services/config/ConfigService';
import { CswMapper } from './csw.mapper';
import { CswParameters, RequestDelegate, RequestOptions } from '../../utils/http-request.utils';
import { Importer } from '../importer';
import { ImportLogMessage, ImportResult } from '../../model/import.result';
import { MiscUtils } from '../../utils/misc.utils';
import { Observer } from 'rxjs';
import { ProfileFactory } from '../../profiles/profile.factory';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader';
import { Summary } from '../../model/summary';
import { SummaryService } from '../../services/config/SummaryService';

let log = require('log4js').getLogger(__filename),
    logSummary = getLogger('summary'),
    logRequest = getLogger('requests'),
    DomParser = require('@xmldom/xmldom').DOMParser;

export class CswImporter extends Importer {
    private profile: ProfileFactory<CswMapper>;
    protected readonly settings: CswSettings;
    private readonly requestDelegate: RequestDelegate;

    private totalRecords = 0;
    private numIndexDocs = 0;

    private generalInfo: object = {};

    constructor(settings, requestDelegate?: RequestDelegate) {
        super(settings);

        this.profile = ProfileFactoryLoader.get();

        // merge default settings with configured ones
        settings = MiscUtils.merge(defaultCSWSettings, settings);

        // if we are looking for incremental updates, add a date filter to the existing record filter
        if (settings.isIncremental) {
            let sumser: SummaryService = new SummaryService();
            let summary: ImportLogMessage = sumser.get(settings.id);
            // only change the record filter (i.e. do an incremental harvest)
            // if there exists a previous run
            if (summary) {
                settings.recordFilter = CswImporter.addModifiedFilter(settings.recordFilter, new Date(summary.lastExecution));
            }
            else {
                log.warn(`Changing type of harvest to "full" because no previous harvest was found for harvester with id ${settings.id}`);
                settings.isIncremental = false;
            }
        }

        // TODO disallow setting "//" in xpaths in the UI

        if (requestDelegate) {
            this.requestDelegate = requestDelegate;
        } else {
            let requestConfig = CswImporter.createRequestConfig(settings);
            this.requestDelegate = new RequestDelegate(requestConfig, CswImporter.createPaging(settings));
        }

        this.settings = settings;
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
                // when running an incremental harvest,
                // clone the old index instead of preparing a new one
                if (this.summary.isIncremental) {
                    await this.elastic.cloneIndex(this.profile.getIndexMappings(), this.profile.getIndexSettings());
                }
                else {
                    await this.elastic.prepareIndex(this.profile.getIndexMappings(), this.profile.getIndexSettings());
                }
                await this.harvest();
                if(this.numIndexDocs > 0 || this.summary.isIncremental) {
                    await this.elastic.sendBulkData(false);
                    await this.elastic.sendBulkUpdate(false);
                    // TODO postHarvestingHandling has to be here, after indexing all data but before deduplicating
                    // TODO this needs a rewrite of the data-service-coupling
                    // this.postHarvestingHandling();
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
        let capabilitiesRequestConfig = CswImporter.createRequestConfig({ ...this.settings, httpMethod: 'GET' }, 'GetCapabilities');
        let capabilitiesRequestDelegate = new RequestDelegate(capabilitiesRequestConfig);
        let capabilitiesResponse = await capabilitiesRequestDelegate.doRequest();
        let capabilitiesResponseDom = new DomParser().parseFromString(capabilitiesResponse);

        // store catalog info from getCapabilities in generalInfo
        let catalog: Catalog = {
            description: CswMapper.select(this.settings.xpaths.capabilities.abstract, capabilitiesResponseDom, true)?.textContent,
            homepage: this.settings.getRecordsUrl,
            // TODO we need a unique ID for each catalog - currently using the alias (used as "global" catalog)
            // TODO or assign a different catalog for each record, depending on a property (address, publisher, etc)? expensive?
            identifier: ConfigService.getGeneralSettings().elasticsearch.alias,
            publisher: { name: CswMapper.select(this.settings.xpaths.capabilities.serviceProvider + '/ows:ProviderName', capabilitiesResponseDom, true)?.textContent },
            title: CswMapper.select(this.settings.xpaths.capabilities.title, capabilitiesResponseDom, true)?.textContent
        };
        this.generalInfo['catalog'] = catalog;

        if (this.settings.maxConcurrent > 1) {
            await this.harvestConcurrently();
        }
        else {
            // this is only here for sentimental reasons;
            // harvestConcurrently() also supports this.settings.maxConcurrent=1
            await this.harvestSequentially();
        }
        // TODO this is at the wrong position and works on the wrong data
        // TODO needs to work on indexed data, not on (mostly) at this point not-anymore-existing _bulkData
        this.postHarvestingHandling();
    }

    protected async postHarvestingHandling(){
        // For Profile specific Handling
    }

    async handleHarvest(delegate: RequestDelegate): Promise<void> {
        log.debug('Requesting next records, starting at', delegate.getStartRecordIndex());
        let response = await delegate.doRequest();
        let harvestTime = new Date(Date.now());

        let responseDom = new DomParser().parseFromString(response);
        let resultsNode = responseDom.getElementsByTagNameNS(namespaces.CSW, 'SearchResults')[0];
        if (resultsNode) {
            let numReturned = resultsNode.getAttribute('numberOfRecordsReturned');
            log.debug(`Received ${numReturned} records from ${this.settings.getRecordsUrl}`);
            let importedDocuments = await this.extractRecords(response, harvestTime);
            await this.updateRecords(importedDocuments);
            // logging
            let beforePercentage = Math.floor(100 * (delegate.getStartRecordIndex() - this.settings.maxRecords) / this.totalRecords);
            let percentage = Math.floor(100 * delegate.getStartRecordIndex() / this.totalRecords);
            if (percentage % 10 == 0 && percentage != beforePercentage && percentage > 0) {
                log.info(`Processing watermark: ${percentage}% (${delegate.getStartRecordIndex()} records)`);
            }
        } else {
            const message = `Error while fetching CSW Records. Will continue to try and fetch next records, if any.\nServer response: ${MiscUtils.truncateErrorMessage(responseDom.toString())}.`;
            log.error(message);
            this.summary.appErrors.push(message);
        }
    }

    async harvestConcurrently(): Promise<void> {
        // collect number of totalRecords up front, so we can harvest concurrently
        let hitsRequestConfig = CswImporter.createRequestConfig({ ...this.settings, resultType: 'hits', startPosition: 1, maxRecords: 1 });
        let hitsRequestDelegate = new RequestDelegate(hitsRequestConfig);
        let hitsResponse = await hitsRequestDelegate.doRequest();
        let hitsResponseDom = new DomParser().parseFromString(hitsResponse);
        let hitsResultsNode = hitsResponseDom.getElementsByTagNameNS(namespaces.CSW, 'SearchResults')[0];
        this.totalRecords = parseInt(hitsResultsNode.getAttribute('numberOfRecordsMatched'));
        log.info(`Number of records to fetch: ${this.totalRecords}`);

        // 1) create paged request delegates
        let delegates = [];
        for (let startPosition = this.settings.startPosition; startPosition < this.totalRecords + this.settings.startPosition; startPosition += this.settings.maxRecords) {
            let requestConfig = CswImporter.createRequestConfig({ ...this.settings, startPosition });
            delegates.push(new RequestDelegate(requestConfig, CswImporter.createPaging({
                startPosition: startPosition,
                maxRecords: this.settings.maxRecords
            })));
        }
        // 2) run in parallel
        const pLimit = (await import('p-limit')).default; // use dynamic import because this module is ESM-only
        const limit = pLimit(this.settings.maxConcurrent);
        await Promise.allSettled(delegates.map(delegate => limit(() => this.handleHarvest(delegate))));
    }

    async harvestSequentially(): Promise<void> {
        while (true) {
            log.debug('Requesting next records');
            let response = await this.requestDelegate.doRequest();
            let harvestTime = new Date(Date.now());

            let responseDom = new DomParser().parseFromString(response);
            let resultsNode = responseDom.getElementsByTagNameNS(namespaces.CSW, 'SearchResults')[0];
            if (resultsNode) {
                let numReturned = resultsNode.getAttribute('numberOfRecordsReturned');
                this.totalRecords = resultsNode.getAttribute('numberOfRecordsMatched');
                if (log.isDebugEnabled()) {
                    log.debug(`Received ${numReturned} records from ${this.settings.getRecordsUrl}`);
                }
                await this.extractRecords(response, harvestTime)
            }
            else {
                const message = `Error while fetching CSW Records. Will continue to try and fetch next records, if any.\nServer response: ${MiscUtils.truncateErrorMessage(responseDom.toString())}.`;
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
            if (this.totalRecords < this.requestDelegate.getStartRecordIndex()) {
                break;
            }
        }
    }

    async extractRecords(getRecordsResponse, harvestTime): Promise<string[]> {
        let promises = [];
        let xml = new DomParser().parseFromString(getRecordsResponse, 'application/xml');
        let records = xml.getElementsByTagNameNS(namespaces.GMD, 'MD_Metadata');
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

        let docsToImport = [];
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

            let doc: any;
            try {
                doc = await this.profile.getIndexDocument().create(mapper);
                docsToImport.push(doc);
            }
            catch (e) {
                log.error('Error creating index document', e);
                this.summary.appErrors.push(e.toString());
                mapper.skipped = true;
            }

            if (!mapper.shouldBeSkipped()) {
                if (!this.settings.dryRun) {
                    promises.push(this.elastic.addDocToBulk(doc, uuid));
                }
            } else {
                this.summary.skippedDocs.push(uuid);
            }
            this.observer.next(ImportResult.running(++this.numIndexDocs, this.totalRecords));
        }
        // TODO the following line raises
        // MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 11 abort listeners added to [EventEmitter]. Use emitter.setMaxListeners() to increase limit
        // may be harmless; investigate if limit increase suffices or if a real leak is occurring
        let settledPromises: PromiseSettledResult<BulkResponse>[] = await Promise.allSettled(promises).catch(err => log.error('Error indexing CSW record', err));
        // filter for the actually imported documents
        let insertedIds = settledPromises.filter(result => result.status == 'fulfilled' && !result.value.queued).reduce((ids, result) => {
            ids.push(...(result as PromiseFulfilledResult<BulkResponse>).value.response.items.filter(item => item.index.result == 'created').map(item => item.index._id));
            return ids;
        }, []);
        // TODO not filtering produces some (inconsequential) ES errors we ignore for now
        // TODO but with filtering (here), we miss some updates -> don't filter atm
        // TODO this has to be handled differently with the database layer anyhow
        return docsToImport;//.filter(doc => insertedIds.includes(doc.identifier));
    }

    /**
     * Is called after a batch of records has been added to the bulk indexing queue.
     * They may not necessarily have been indexed yet.
     */
    protected async updateRecords(documents: any[]) {
        // For Profile specific Handling
    }

    getMapper(settings, record, harvestTime, storedData, summary, generalInfo): CswMapper {
        return new CswMapper(settings, record, harvestTime, storedData, summary, generalInfo);
    }

    static createRequestConfig(settings: CswSettings, request = 'GetRecords'): RequestOptions {
        let requestConfig: RequestOptions = {
            method: settings.httpMethod || "GET",
            uri: settings.getRecordsUrl,
            json: false,
            headers: RequestDelegate.cswRequestHeaders(),
            proxy: settings.proxy || null
        };

        if (settings.httpMethod === "POST") {
            if (request === 'GetRecords') {
                requestConfig.body = `<?xml version="1.0" encoding="UTF-8"?>
                <GetRecords xmlns="${namespaces.CSW}"
                            xmlns:gmd="${namespaces.GMD}"
                            xmlns:xsi="${namespaces.XSI}"
                            xmlns:ogc="${namespaces.OGC}"
                            xsi:schemaLocation="${namespaces.CSW}"
                            service="CSW"
                            version="2.0.2"
                            resultType="${settings.resultType}"
                            outputFormat="application/xml"
                            outputSchema="${namespaces.GMD}"
                            startPosition="${settings.startPosition}"
                            maxRecords="${settings.maxRecords}">
                    <DistributedSearch/>
                    <Query typeNames="gmd:MD_Metadata">
                        <ElementSetName typeNames="">full</ElementSetName>
                        ${settings.recordFilter ? `
                        <Constraint version="1.1.0">
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
                outputSchema: namespaces.GMD,
                typeNames: 'gmd:MD_Metadata',
                CONSTRAINTLANGUAGE: 'FILTER',
                startPosition: settings.startPosition,
                maxRecords: settings.maxRecords,
                CONSTRAINT_LANGUAGE_VERSION: '1.1.0',
                elementSetName: 'full'
            };
            if (request === 'GetRecords' && settings.recordFilter) {
                requestConfig.qs.constraint = settings.recordFilter;
            }
        }

        return requestConfig;
    }

    static createPaging(settings: Partial<CswSettings>) {
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
