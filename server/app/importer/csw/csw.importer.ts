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
import { BulkResponse } from '../../persistence/elastic.utils';
import { Catalog } from '../../model/dcatApPlu.model';
import { ConfigService } from '../../services/config/ConfigService';
import { CswMapper } from './csw.mapper';
import { CswParameters, RequestDelegate, RequestOptions } from '../../utils/http-request.utils';
import { DOMParser as DomParser } from '@xmldom/xmldom';
import { Entity } from '../../model/entity';
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
    logRequest = getLogger('requests');

export class CswImporter extends Importer {

    protected domParser: DomParser;
    protected profile: ProfileFactory<CswMapper>;
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
                settings.recordFilter = this.addModifiedFilter(settings.recordFilter, new Date(summary.lastExecution));
            }
            else {
                log.warn(`Changing type of harvest to "full" because no previous harvest was found for harvester with id ${settings.id}`);
                settings.isIncremental = false;
            }
        }
        if (requestDelegate) {
            this.requestDelegate = requestDelegate;
        } else {
            let requestConfig = CswImporter.createRequestConfig(settings);
            this.requestDelegate = new RequestDelegate(requestConfig, CswImporter.createPaging(settings));
        }
        this.settings = settings;
        this.domParser = new DomParser({
            errorHandler: (level, msg) => {
                // throw on error, swallow rest
                if (level == 'error') {
                    throw new Error(msg);
                }
            }
        });
    }

    private addModifiedFilter(recordFilter: string, lastRunDate: Date): string {
        let incrementalFilter = this.domParser.parseFromString(`<ogc:PropertyIsGreaterThanOrEqualTo><ogc:PropertyName>Modified</ogc:PropertyName><ogc:Literal>${lastRunDate.toISOString()}</ogc:Literal></ogc:PropertyIsGreaterThanOrEqualTo>`);
        if (recordFilter != '') {
            recordFilter = recordFilter.replace('<ogc:Filter>', '<ogc:And>');
            recordFilter = recordFilter.replace('</ogc:Filter>', '</ogc:And>');
            let andElem = this.domParser.parseFromString(recordFilter);
            andElem.documentElement.appendChild(incrementalFilter);
            incrementalFilter = andElem;
        }
        let modifiedFilter = this.domParser.parseFromString('<ogc:Filter/>');
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
                await this.database.beginTransaction();
                await this.harvest();
                if(this.numIndexDocs > 0 || this.summary.isIncremental) {
                    if (this.summary.databaseErrors.length == 0) {
                        await this.database.commitTransaction();
                        await this.database.pushToElastic3ReturnOfTheJedi(this.elastic, this.settings.getRecordsUrl);
                    }
                    else {
                        await this.database.rollbackTransaction();
                    }
                    observer.next(ImportResult.complete(this.summary));
                    observer.complete();
                } else {
                    if(this.summary.appErrors.length === 0) {
                        this.summary.appErrors.push('No Results');
                    }
                    log.error('No results during CSW import - Keep old index');
                    observer.next(ImportResult.complete(this.summary, 'No Results - Keep old index'));
                    observer.complete();
                }
            } catch (err) {
                this.summary.appErrors.push(err.message ? err.message : err);
                log.error('Error during CSW import', err);
                observer.next(ImportResult.complete(this.summary, 'Error happened'));
                observer.complete();
            }
        }
    }

    async harvest(): Promise<void> {
        let capabilitiesRequestConfig = CswImporter.createRequestConfig({ ...this.settings, httpMethod: 'GET' }, 'GetCapabilities');
        let capabilitiesRequestDelegate = new RequestDelegate(capabilitiesRequestConfig);
        let capabilitiesResponse = await capabilitiesRequestDelegate.doRequest();
        let capabilitiesResponseDom = this.domParser.parseFromString(capabilitiesResponse);

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
        // send leftovers
        await this.database.sendBulkData();
    }

    protected async postHarvestingHandling(){
        // For Profile specific Handling
    }

    async handleHarvest(delegate: RequestDelegate): Promise<void> {
        log.debug('Requesting next records, starting at', delegate.getStartRecordIndex());
        let response = await delegate.doRequest();
        let harvestTime = new Date(Date.now());

        let responseDom = this.domParser.parseFromString(response);
        let resultsNode = responseDom.getElementsByTagNameNS(namespaces.CSW, 'SearchResults')[0];
        if (resultsNode) {
            let numReturned = resultsNode.getAttribute('numberOfRecordsReturned');
            log.debug(`Received ${numReturned} records from ${this.settings.getRecordsUrl}`);
            let importedDocuments = await this.extractRecords(response, harvestTime);
            await this.updateRecords(importedDocuments);
            // logging
            // let beforePercentage = Math.floor(100 * (delegate.getStartRecordIndex() - this.settings.maxRecords) / this.totalRecords);
            // let percentage = Math.floor(100 * delegate.getStartRecordIndex() / this.totalRecords);
            // if (percentage % 10 == 0 && percentage != beforePercentage && percentage > 0) {
            //     log.info(`Processing watermark: ${percentage}% (${delegate.getStartRecordIndex()} records)`);
            // }
            let processingTime = Math.floor((Date.now() - harvestTime.getTime()) / 1000);
            log.info(`Finished processing batch from ${delegate.getStartRecordIndex().toString().padStart(6, ' ')}, start: ${harvestTime.toISOString()}, ${processingTime.toString().padStart(3, ' ')}s`);
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
        let hitsResponseDom = this.domParser.parseFromString(hitsResponse);
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

            let responseDom = this.domParser.parseFromString(response);
            let resultsNode = responseDom.getElementsByTagNameNS(namespaces.CSW, 'SearchResults')[0];
            if (resultsNode) {
                let numReturned = resultsNode.getAttribute('numberOfRecordsReturned');
                this.totalRecords = parseInt(resultsNode.getAttribute('numberOfRecordsMatched'));
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
        let xml = this.domParser.parseFromString(getRecordsResponse, 'application/xml');
        let records = xml.getElementsByTagNameNS(namespaces.GMD, 'MD_Metadata');
        let ids = [];
        for (let i = 0; i < records.length; i++) {
            ids.push(CswMapper.getCharacterStringContent(records[i], 'fileIdentifier'));
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

            let mapper = this.getMapper(this.settings, records[i], harvestTime, this.summary, this.generalInfo);

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

            if (!this.settings.dryRun && !mapper.shouldBeSkipped()) {
                let entity: Entity = {
                    identifier: uuid,
                    source: this.settings.getRecordsUrl,
                    collection_id: this.database.defaultCatalog.id,
                    operates_on: mapper.getOperatesOn(),
                    dataset: doc,
                    original_document: mapper.getHarvestedData()
                };
                promises.push(this.database.addEntityToBulk(entity));
            } else {
                this.summary.skippedDocs.push(uuid);
            }
            this.observer.next(ImportResult.running(++this.numIndexDocs, this.totalRecords));
        }
        let settledPromises: PromiseSettledResult<BulkResponse>[] = await Promise.allSettled(promises).catch(err => log.error('Error persisting CSW record', err));
        // filter for the actually imported documents
        // let insertedIds = settledPromises.filter(result => result.status == 'fulfilled' && !result.value.queued).reduce((ids, result) => {
        //     ids.push(...(result as PromiseFulfilledResult<BulkResponse>).value.response.items.filter(item => item.index.result == 'created').map(item => item.index._id));
        //     return ids;
        // }, []);
        // TODO not filtering produces some (inconsequential) ES errors we ignore for now
        // TODO but with filtering (here), we miss some updates -> don't filter atm
        // TODO this has to be handled differently with the database layer anyhow
        return docsToImport;//.filter(doc => insertedIds.includes(doc.identifier));
    }

    /**
     * Is called after a batch of records has been added to the bulk persisting queue.
     * They may not necessarily have been persisted yet.
     */
    protected async updateRecords(documents: any[]) {
        // For Profile specific Handling
    }

    getMapper(settings, record, harvestTime, summary, generalInfo): CswMapper {
        return new CswMapper(settings, record, harvestTime, summary, generalInfo);
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
