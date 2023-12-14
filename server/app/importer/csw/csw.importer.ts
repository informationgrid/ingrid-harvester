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

import * as MiscUtils from '../../utils/misc.utils';
import * as ServiceUtils from '../../utils/service.utils';
import { defaultCSWSettings, CswSettings } from './csw.settings';
import { getLogger } from 'log4js';
import { namespaces } from '../../importer/namespaces';
import { BulkResponse } from '../../persistence/elastic.utils';
import { Catalog } from '../../model/dcatApPlu.model';
import { CouplingEntity, RecordEntity } from '../../model/entity';
import { CswMapper } from './csw.mapper';
import { CswParameters, RequestDelegate, RequestOptions } from '../../utils/http-request.utils';
import { Distribution } from '../../model/distribution';
import { DOMParser } from '@xmldom/xmldom';
import { Importer } from '../importer';
import { ImportLogMessage, ImportResult } from '../../model/import.result';
import { Observer } from 'rxjs';
import { ProfileFactory } from '../../profiles/profile.factory';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader';
import { Summary } from '../../model/summary';
import { SummaryService } from '../../services/config/SummaryService';

const log = getLogger(__filename);
const logRequest = getLogger('requests');

export class CswImporter extends Importer {

    protected domParser: DOMParser;
    protected profile: ProfileFactory<CswMapper>;
    protected readonly settings: CswSettings;
    private readonly requestDelegate: RequestDelegate;

    // ServiceType#GetCapabilitiesURL -> { DatasetUUID -> typenames[] }
    private wfsFeatureTypeMap = new Map<string, { [key: string]: string[] }>();
    // ServiceType#GetCapabilitiesURL -> { DatasetUUID -> layernames[] }
    private wmsLayerNameMap = new Map<string, { [key: string]: string[] }>();

    private totalRecords = 0;
    private numIndexDocs = 0;

    private generalInfo: object = {};

    constructor(settings, requestDelegate?: RequestDelegate) {
        super(settings);

        this.profile = ProfileFactoryLoader.get();

        this.domParser = new DOMParser({
            errorHandler: (level, msg) => {
                // throw on error, swallow rest
                if (level == 'error') {
                    throw new Error(msg);
                }
            }
        });

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

    private addDatasetFilter(recordFilter: string) {
        let datasetFilter = '<ogc:PropertyIsEqualTo><ogc:PropertyName>Type</ogc:PropertyName><ogc:Literal>dataset</ogc:Literal></ogc:PropertyIsEqualTo>';
        let filter = '<ogc:Filter>';
        if (recordFilter != '') {
            filter += recordFilter.replace('<ogc:Filter>', '<ogc:And>').replace('</ogc:Filter>', '');
            filter += datasetFilter;
            filter += '</ogc:And>';
        }
        else {
            filter += datasetFilter;
        }
        filter += '</ogc:Filter>';
        return filter;
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
                // get datasets
                await this.harvest();
                if (this.numIndexDocs > 0 || this.summary.isIncremental) {
                    // self-coupling, i.e. resolving WFS and WMS distributions
                    // TODO maybe needs an off-switch
                    await this.coupleSelf();
                    // get services
                    await this.harvestServices();
                    // data-service-coupling
                    await this.coupleDatasetsServices();

                    if (this.summary.databaseErrors.length == 0) {
                        await this.database.commitTransaction();
                        await this.database.pushToElastic3ReturnOfTheJedi(this.elastic, this.settings.getRecordsUrl);
                    }
                    else {
                        await this.database.rollbackTransaction();
                    }
                    observer.next(ImportResult.complete(this.summary));
                    observer.complete();
                }
                else {
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
        let catalog: Catalog = this.database.defaultCatalog;
        this.generalInfo['catalog'] = catalog;

        // collect number of totalRecords up front, so we can harvest concurrently
        let hitsRequestConfig = CswImporter.createRequestConfig({ ...this.settings, recordFilter: this.addDatasetFilter(this.settings.recordFilter), resultType: 'hits', startPosition: 1, maxRecords: 1 });
        let hitsRequestDelegate = new RequestDelegate(hitsRequestConfig);
        let hitsResponse = await hitsRequestDelegate.doRequest();
        let hitsResponseDom = this.domParser.parseFromString(hitsResponse);
        let hitsResultsNode = hitsResponseDom.getElementsByTagNameNS(namespaces.CSW, 'SearchResults')[0];
        this.totalRecords = parseInt(hitsResultsNode.getAttribute('numberOfRecordsMatched'));
        log.info(`Number of records to fetch: ${this.totalRecords}`);

        // 1) create paged request delegates
        let delegates = [];
        for (let startPosition = this.settings.startPosition; startPosition < this.totalRecords + this.settings.startPosition; startPosition += this.settings.maxRecords) {
            let requestConfig = CswImporter.createRequestConfig({ ...this.settings, recordFilter: this.addDatasetFilter(this.settings.recordFilter), startPosition });
            delegates.push(new RequestDelegate(requestConfig, CswImporter.createPaging({
                startPosition: startPosition,
                maxRecords: this.settings.maxRecords
            })));
        }
        // 2) run in parallel
        const pLimit = (await import('p-limit')).default; // use dynamic import because this module is ESM-only
        const limit = pLimit(this.settings.maxConcurrent);
        await Promise.allSettled(delegates.map(delegate => limit(() => this.handleHarvest(delegate))));
        log.info(`Finished requests`);
        // 3) persist leftovers
        await this.database.sendBulkData();
    }

    async harvestServices(): Promise<void> {
        let catalog: Catalog = this.database.defaultCatalog;
        this.generalInfo['catalog'] = catalog;

        let delegates = [];
        let datasetIds = await this.database.getDatasetIdentifiers(this.settings.getRecordsUrl);
        let chunkSize = 30;

        for (let i = 0; i < datasetIds.length; i+= chunkSize) {
            // add ID filter
            const chunk = datasetIds.slice(i, i + chunkSize);
            let recordFilter = '<ogc:Filter><ogc:Or>';
            for (let identifier of chunk) {
                // TODO OperatesOnIdentifier?
                recordFilter += `<ogc:PropertyIsEqualTo><ogc:PropertyName>OperatesOn</ogc:PropertyName><ogc:Literal>${identifier}</ogc:Literal></ogc:PropertyIsEqualTo>\n`;
            }
            recordFilter += '</ogc:Or></ogc:Filter>';

            // collect number of totalRecords up front, so we can harvest concurrently
            let hitsRequestConfig = CswImporter.createRequestConfig({ ...this.settings, recordFilter, resultType: 'hits', startPosition: 1, maxRecords: 1 });
            let hitsRequestDelegate = new RequestDelegate(hitsRequestConfig);
            let hitsResponse = await hitsRequestDelegate.doRequest();
            let hitsResponseDom = this.domParser.parseFromString(hitsResponse);
            let hitsResultsNode = hitsResponseDom.getElementsByTagNameNS(namespaces.CSW, 'SearchResults')[0];
            this.totalRecords = parseInt(hitsResultsNode.getAttribute('numberOfRecordsMatched'));
            log.info(`Number of records to fetch: ${this.totalRecords}`);

            // 1) create paged request delegates
            for (let startPosition = this.settings.startPosition; startPosition < this.totalRecords + this.settings.startPosition; startPosition += this.settings.maxRecords) {
                let requestConfig = CswImporter.createRequestConfig({ ...this.settings, recordFilter, startPosition });
                delegates.push(new RequestDelegate(requestConfig, CswImporter.createPaging({
                    startPosition: startPosition,
                    maxRecords: this.settings.maxRecords
                })));
            }
        }
        // 2) run in parallel
        const pLimit = (await import('p-limit')).default; // use dynamic import because this module is ESM-only
        const limit = pLimit(this.settings.maxConcurrent);
        await Promise.allSettled(delegates.map(delegate => limit(() => this.handleHarvest(delegate))));
        log.info(`Finished requests`);
        // 3) persist leftovers
        await this.database.sendBulkData();
    }

    async coupleSelf() {
        // get all datasets
        let recordEntities: RecordEntity[] = await this.database.getDatasets(this.settings.getRecordsUrl) ?? [];
        // for all services, get WFS, WMS info and merge into dataset
        // 2) run in parallel
        const pLimit = (await import('p-limit')).default; // use dynamic import because this module is ESM-only
        const limit = pLimit(this.settings.maxConcurrent);
        await Promise.allSettled(recordEntities.map(recordEntity => limit(() => this.coupleService(recordEntity, true))));
        // 3) persist leftovers
        await this.database.sendBulkCouples();
    }

    async coupleDatasetsServices() {
        // get all services
        let serviceEntities: RecordEntity[] = await this.database.getServices(this.settings.getRecordsUrl) ?? [];
        // for all services, get WFS, WMS info and merge into dataset
        // 2) run in parallel
        const pLimit = (await import('p-limit')).default; // use dynamic import because this module is ESM-only
        const limit = pLimit(this.settings.maxConcurrent);
        await Promise.allSettled(serviceEntities.map(serviceEntity => limit(() => this.coupleService(serviceEntity, false))));
        // 3) persist leftovers
        await this.database.sendBulkCouples();
    }

    async coupleService(serviceEntity: RecordEntity, coupleSelf = false) {
        for (let service of serviceEntity.dataset.distributions) {
            if (coupleSelf) {
                service.operates_on = [serviceEntity.identifier];
                // let rsidentifier = MiscUtils.extractDatasetUuid(serviceEntity.dataset.resource_identifier);
                // if (rsidentifier) {
                //     service.operates_on.push(rsidentifier);
                // }
                // let identifierOfServiceUrl = MiscUtils.extractDatasetUuid(service.accessURL);
                // if (identifierOfServiceUrl) {
                //     service.operates_on.push(identifierOfServiceUrl);
                // }
            }
            let serviceType = service.format?.[0].toUpperCase();
            switch (serviceType) {
                case 'WFS':
                    for (let identifier of service.operates_on) {
                        if (!this.wfsFeatureTypeMap.has(service.accessURL)) {
                            this.wfsFeatureTypeMap.set(service.accessURL, await ServiceUtils.getWfsFeatureTypeMap(service.accessURL));
                        }
                        let getCapabilities = this.wfsFeatureTypeMap.get(service.accessURL);
                        // let datasetUuid = MiscUtils.extractDatasetUuid(service.accessURL);
                        let typeNames = getCapabilities[identifier];// ?? [];// ?? getCapabilities[service.operates_on_xlink] ?? [];
                        // fallback XPLAN - RP_Plan
                        // TODO how can we abstract that?
                        if (!typeNames) {
							for (let typeName of ServiceUtils.RO_DEFAULT_TYPENAMES) {
								if (Object.values(getCapabilities).some(featureTypeMap => featureTypeMap.includes(typeName))) {
									typeNames = [typeName];
									break;
								}
							}
                        }
                        let spatial;
                        let errors = [];
                        for (let typeName of typeNames ?? []) {
                            // if (typeName == 'plu:SupplementaryRegulation') {
                            //     continue;
                            // }
                            try {
                                // // resolve GetFeatures, typeNames=<Name>
                                // // parse, get Polygon
                                spatial = await ServiceUtils.parseWfsFeatureCollection(service.accessURL, typeName, this.settings.simplifyTolerance);
                                // spatial = GeoJsonUtils.sanitize(spatial);
                                // // save in dataset
                                // await this.updateDataset(serviceEntity.operates_on_uuid, geometryCollection);
                                // break;
                            }
                            catch (e) {
                                errors.push(e?.message);
                            }
                        }
                        // if (spatial) {
						let distribution: Distribution = { ...service, resolvedGeometry: spatial };
						let coupling: CouplingEntity = {
							dataset_identifier: identifier,
							service_id: serviceEntity.id,
							service_type: serviceType,
							distribution
						};
						if (errors.length) {
							coupling.distribution.errors ??= [];
							coupling.distribution.errors.push(...errors);
						}
						await this.database.addEntityToBulk(coupling);
                        // }
                        // else {
                        //     log.warn(`Did not fetch WFS from ${serviceEntity.identifier}: ${errors.join(', ')}`);
                        // }
                    }
                    break;
                case 'WMS':
                    for (let identifier of service.operates_on) {
                        if (!this.wmsLayerNameMap.has(service.accessURL)) {
                            this.wmsLayerNameMap.set(service.accessURL, await ServiceUtils.getWmsLayerNameMap(service.accessURL));
                        }
                        let getCapabilities = this.wmsLayerNameMap.get(service.accessURL);
                        let layerNames = getCapabilities[identifier];
                        // fallback XPLAN - RP_Plan
                        // TODO how can we abstract that?
                        if (!layerNames) {
							for (let layerName of ServiceUtils.RO_DEFAULT_LAYERNAMES) {
								if (Object.values(getCapabilities).some(featureTypeMap => featureTypeMap.includes(layerName))) {
									layerNames = [layerName];
									break;
								}
							}
                        }
                        let distribution: Distribution = { ...service, mapLayerNames: layerNames };
                        let coupling: CouplingEntity = {
                            dataset_identifier: identifier,
                            service_id: serviceEntity.id,
                            service_type: serviceType,
                            distribution
                        };
                        await this.database.addEntityToBulk(coupling);
                    }
                    break;
                default:
                    break;
            }
        }
    }

    protected async postHarvestingHandling(){
        // For Profile specific Handling
    }

    async handleHarvest(delegate: RequestDelegate): Promise<void> {
        log.info('Requesting next records, starting at', delegate.getStartRecordIndex());
        let response = await delegate.doRequest();
        let harvestTime = new Date(Date.now());

        let responseDom = this.domParser.parseFromString(response);
        let resultsNode = responseDom.getElementsByTagNameNS(namespaces.CSW, 'SearchResults')[0];
        if (resultsNode) {
            let numReturned = resultsNode.getAttribute('numberOfRecordsReturned');
            log.debug(`Received ${numReturned} records from ${this.settings.getRecordsUrl}`);
            let importedDocuments = await this.extractRecords(response, harvestTime);
            await this.updateRecords(importedDocuments, this.generalInfo['catalog'].id);
            // logging
            // let beforePercentage = Math.floor(100 * (delegate.getStartRecordIndex() - this.settings.maxRecords) / this.totalRecords);
            // let percentage = Math.floor(100 * delegate.getStartRecordIndex() / this.totalRecords);
            // if (percentage % 10 == 0 && percentage != beforePercentage && percentage > 0) {
            //     log.info(`Processing watermark: ${percentage}% (${delegate.getStartRecordIndex()} records)`);
            // }
            let processingTime = Math.floor((Date.now() - harvestTime.getTime()) / 1000);
            log.info(`Finished processing batch from ${delegate.getStartRecordIndex().toString().padStart(6, ' ')}, start: ${harvestTime.toISOString()}, ${processingTime.toString().padStart(3, ' ')}s`);
        }
        else {
            const message = `Error while fetching CSW Records. Will continue to try and fetch next records, if any.\nServer response: ${MiscUtils.truncateErrorMessage(responseDom.toString())}.`;
            log.error(message);
            this.summary.appErrors.push(message);
        }
    }

    async extractRecords(getRecordsResponse, harvestTime): Promise<string[]> {
        let promises: Promise<BulkResponse>[] = [];
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
                let entity: RecordEntity = {
                    identifier: uuid,
                    source: this.settings.getRecordsUrl,
                    collection_id: this.generalInfo['catalog'].id,
                    dataset: doc,
                    original_document: mapper.getHarvestedData()
                };
                promises.push(this.database.addEntityToBulk(entity));
            } else {
                this.summary.skippedDocs.push(uuid);
            }
            this.observer.next(ImportResult.running(++this.numIndexDocs, this.totalRecords));
        }
        await Promise.allSettled(promises).catch(err => log.error('Error persisting CSW record', err));
        // let settledPromises: void | PromiseSettledResult<BulkResponse>[] = await Promise.allSettled(promises).catch(err => log.error('Error persisting CSW record', err));
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
    protected async updateRecords(documents: any[], collectionId: number) {
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
            proxy: settings.proxy || null,
            timeout: settings.timeout
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
