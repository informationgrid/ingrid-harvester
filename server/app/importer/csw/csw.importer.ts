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
import * as ServiceUtils from '../../utils/service.utils.js';
import * as XpathUtils from '../../utils/xpath.utils.js';
import { defaultCSWSettings, CswSettings } from './csw.settings.js';
import { getLogger } from 'log4js';
import { namespaces } from '../../importer/namespaces.js';
import { BulkResponse } from '../../persistence/elastic.utils.js';
import { Catalog } from '../../model/dcatApPlu.model.js';
import { CouplingEntity, RecordEntity } from '../../model/entity.js';
import { CswMapper } from './csw.mapper.js';
import { CswParameters, RequestDelegate, RequestOptions } from '../../utils/http-request.utils.js';
import { Distribution } from '../../model/distribution.js';
import { DOMParser } from '@xmldom/xmldom';
import { Importer } from '../importer.js';
import { ImportLogMessage, ImportResult } from '../../model/import.result.js';
import { IndexDocument } from '../../model/index.document.js';
import { MailServer } from '../../utils/nodemailer.utils.js';
import { Observer } from 'rxjs';
import { ProfileFactory } from '../../profiles/profile.factory.js';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader.js';
import { Summary } from '../../model/summary.js';
import { SummaryService } from '../../services/config/SummaryService.js';

const log = getLogger(__filename);
const logRequest = getLogger('requests');

export class CswImporter extends Importer {

    protected domParser: DOMParser;
    protected profile: ProfileFactory<CswMapper>;
    protected settings: CswSettings;
    protected getRecordsURL: string;

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
        this.domParser = MiscUtils.getDomParser();
        this.settings = MiscUtils.merge(defaultCSWSettings, settings);
    }

    private appendFilter(newFilter: string): string {
        if (!this.settings.recordFilter) {
            return `<ogc:Filter>${newFilter}</ogc:Filter>`;
        }
        else {
            const parseXml = (s: string) => this.domParser.parseFromString(s);
            try {
                let recordFilterElem = parseXml(this.settings.recordFilter).getElementsByTagName('ogc:Filter')[0];
                let filterChildElem = XpathUtils.firstElementChild(recordFilterElem);
                let filterElem = parseXml('<ogc:Filter/>').documentElement;
                let contentElem = filterElem.appendChild(parseXml('<ogc:And/>').documentElement);
                contentElem.appendChild(parseXml(newFilter));
                contentElem.appendChild(filterChildElem);
                return filterElem.toString();
            }
            catch (e) {
                throw Error('No valid Filter element defined.');
            }
        }
    }

    async exec(observer: Observer<ImportLogMessage>): Promise<void> {
        if (this.settings.dryRun) {
            log.debug('Dry run option enabled. Skipping index creation.');
            await this.harvest();
            log.debug('Skipping finalisation of index for dry run.');
            observer.next(ImportResult.complete(this.summary, 'Dry run ... no indexing of data'));
        }
        else {
            try {
                let transactionTimestamp = await this.database.beginTransaction();
                // configure for incremental harvesting
                if (this.settings.isIncremental) {
                    // only change the record filter (i.e. do an incremental harvest) if a previous run exists
                    let lastHarvestingDate = new SummaryService().get(this.settings.id)?.lastExecution;
                    if (lastHarvestingDate) {
                        let lastModifiedFilter = `<ogc:PropertyIsGreaterThanOrEqualTo><ogc:PropertyName>Modified</ogc:PropertyName><ogc:Literal>${new Date(lastHarvestingDate).toISOString()}</ogc:Literal></ogc:PropertyIsGreaterThanOrEqualTo>`;
                        this.settings.recordFilter = this.appendFilter(lastModifiedFilter);
                    }
                    else {
                        log.warn(`Changing type of harvesting to "full" because no previous harvesting was found for harvester with id ${this.settings.id}`);
                        this.settings.isIncremental = false;
                    }
                }
                // get datasets
                let numIndexDocs = await this.harvest();
                if (!this.settings.isIncremental) {
                    // did the harvesting return results at all?
                    if (numIndexDocs == 0) {
                        throw new Error(`No results during ${this.settings.type} import`);
                    }
                    // ensure that less than X percent of existing datasets are slated for deletion
                    let nonFetchedPercentage = await this.database.nonFetchedPercentage(this.settings.sourceURL, transactionTimestamp);
                    let { mail, cancel } = this.generalConfig.harvesting;
                    if (this.generalConfig.mail.enabled && mail.enabled && nonFetchedPercentage > mail.minDifference) {
                        let msg = `Not enough coverage of previous results (${nonFetchedPercentage}%)`;
                        MailServer.getInstance().send(msg, `An error occurred during harvesting: ${msg}`);
                    }
                    if (cancel.enabled && nonFetchedPercentage > cancel.minDifference) {
                        throw new Error(`Not enough coverage of previous results (${nonFetchedPercentage}%)`);
                    }
                }

                // self-coupling (can include resolving WFS and WMS distributions, which is time-intensive)
                //await this.coupleSelf(this.settings.resolveOgcDistributions);
                // get services separately (time-intensive)
                if (this.settings.harvestingMode == 'separate') {
                    await this.harvestServices();
                }
                // data-service-coupling (can include resolving WFS and WMS distributions, which is time-intensive)
                await this.coupleDatasetsServices(this.settings.resolveOgcDistributions);

                // did fatal errors occur (ie DB or APP errors)?
                if (this.summary.databaseErrors.length > 0 || this.summary.appErrors.length > 0) {
                    throw new Error();
                }

                if (!this.settings.isIncremental) {
                    await this.database.deleteNonFetchedDatasets(this.settings.sourceURL, transactionTimestamp);
                }
                await this.database.commitTransaction();
                await this.database.pushToElastic3ReturnOfTheJedi(this.elastic, this.settings.sourceURL);
                await this.postHarvestingHandling();
                observer.next(ImportResult.complete(this.summary));
            }
            catch (err) {
                if (err.message) {
                    this.summary.appErrors.push(err.message);
                }
                await this.database.rollbackTransaction();
                let msg = this.summary.appErrors.length > 0 ? this.summary.appErrors[0] : this.summary.databaseErrors[0];
                if (this.generalConfig.mail.enabled) {
                    MailServer.getInstance().send(msg, `An error occurred during harvesting: ${msg}`);
                }
                log.error(err);
                observer.next(ImportResult.complete(this.summary, msg));
            }
        }
        observer.complete();
    }

    protected async harvest(): Promise<number> {
        log.info(`Started requesting records`);
        let catalog: Catalog = await this.database.getCatalog(this.settings.catalogId);
        if (catalog == null) {
            throw new Error(`Catalog with identifier '${this.settings.catalogId}' not found.`)
        }
        this.generalInfo['catalog'] = catalog;

        if (this.settings.harvestingMode == 'separate') {
            let datasetFilter = '<ogc:PropertyIsEqualTo><ogc:PropertyName>Type</ogc:PropertyName><ogc:Literal>dataset</ogc:Literal></ogc:PropertyIsEqualTo>';
            this.settings.recordFilter = this.appendFilter(datasetFilter);
        }
        // obtain GetRecords URL from GetCapabilities
        let getCapabilitiesConfig = this.createRequestConfig(null, 'GetCapabilities');
        let getCapabilitiesDelegate = new RequestDelegate(getCapabilitiesConfig);
        let getCapabilitiesResponse = await getCapabilitiesDelegate.doRequest();
        let getCapabilitiesResponseDom = this.domParser.parseFromString(getCapabilitiesResponse);
        this.getRecordsURL = CswMapper.select('./ows:OperationsMetadata/ows:Operation[@name="GetRecords"]/ows:DCP/ows:HTTP/ows:Post/@xlink:href', XpathUtils.firstElementChild(getCapabilitiesResponseDom), true)?.textContent;
        if (!this.getRecordsURL) {
            throw new Error(getCapabilitiesResponse);
        }
        // collect number of totalRecords up front, so we can harvest concurrently
        let hitsRequestConfig = this.createRequestConfig({
            resultType: 'hits',
            startPosition: 1,
            maxRecords: 1
        });
        let hitsRequestDelegate = new RequestDelegate(hitsRequestConfig);
        let hitsResponse = await hitsRequestDelegate.doRequest();
        let hitsResponseDom = this.domParser.parseFromString(hitsResponse);
        let hitsResultsNode = hitsResponseDom.getElementsByTagNameNS(namespaces.CSW, 'SearchResults')[0];
        if (!hitsResultsNode) {
            throw new Error(hitsResponse);
        }
        this.totalRecords = parseInt(hitsResultsNode.getAttribute('numberOfRecordsMatched'));
        log.info(`Number of records to fetch: ${this.totalRecords}`);

        // 1) create paged request delegates
        let delegates = [];
        // TODO this is still not correct?
        for (let startPosition = this.settings.startPosition; startPosition < this.totalRecords + this.settings.startPosition; startPosition += this.settings.maxRecords) {
            let requestConfig = this.createRequestConfig({ startPosition });
            delegates.push(new RequestDelegate(requestConfig, CswImporter.createPaging({
                startPosition: startPosition,
                maxRecords: this.settings.maxRecords
            })));
        }
        // 2) run in parallel
        const pLimit = (await import('p-limit')).default; // use dynamic import because this module is ESM-only
        const limit = pLimit(this.settings.maxConcurrent);
        await Promise.allSettled(delegates.map(delegate => limit(() => this.handleHarvest(delegate))));
        log.info(`Finished requesting records`);
        // 3) persist leftovers
        await this.database.sendBulkData();

        return this.numIndexDocs;
    }

    async harvestServices(): Promise<void> {
        let datasetIds = await this.database.getDatasetIdentifiers(this.settings.sourceURL);
        let numChunks = Math.ceil(datasetIds.length / this.settings.maxServices);
        log.info(`Requesting services for ${datasetIds.length} datasets in ${numChunks} chunks`);
        // 1) create paged request delegates
        let delegates = [];
        for (let i = 0; i < datasetIds.length; i+= this.settings.maxServices) {
            // add ID filter
            const chunk = datasetIds.slice(i, i + this.settings.maxServices);
            let recordFilter = '<ogc:Filter>' + (chunk.length > 1 ? '<ogc:Or>' : '');
            for (let identifier of chunk) {
                recordFilter += `<ogc:PropertyIsEqualTo><ogc:PropertyName>OperatesOn</ogc:PropertyName><ogc:Literal>${identifier}</ogc:Literal></ogc:PropertyIsEqualTo>\n`;
            }
            recordFilter +=  (chunk.length > 1 ? '</ogc:Or>' : '') + '</ogc:Filter>';
            delegates.push(new RequestDelegate(
                this.createRequestConfig({ recordFilter }),
                CswImporter.createPaging({ startPosition: this.settings.startPosition })
            ));
        }
        // 2) run in parallel
        const pLimit = (await import('p-limit')).default; // use dynamic import because this module is ESM-only
        const limit = pLimit(this.settings.maxConcurrent);
        await Promise.allSettled(delegates.map(delegate => limit(() => this.handleHarvest(delegate))));
        // 3) persist leftovers
        await this.database.sendBulkData();
        log.info(`Finished requesting services`);
    }

    async coupleSelf(resolveOgcDistributions: boolean) {
        log.info(`Started self-coupling`);
        // get all datasets
        let recordEntities: RecordEntity[] = await this.database.getDatasets(this.settings.sourceURL) ?? [];
        // for all services, get WFS, WMS info and merge into dataset
        // 2) run in parallel
        const pLimit = (await import('p-limit')).default; // use dynamic import because this module is ESM-only
        const limit = pLimit(this.settings.maxConcurrent);
        await Promise.allSettled(recordEntities.map(recordEntity => limit(() => this.coupleService(recordEntity, resolveOgcDistributions, true))));
        log.info(`Finished self-coupling`);
        // 3) persist leftovers
        await this.database.sendBulkCouples();
    }

    async coupleDatasetsServices(resolveOgcDistributions: boolean) {
        log.info(`Started dataset-service coupling`);
        // get all services
        let serviceEntities: RecordEntity[] = await this.database.getServices(this.settings.sourceURL) ?? [];
        // for all services, get WFS, WMS info and merge into dataset
        // 2) run in parallel
        const pLimit = (await import('p-limit')).default; // use dynamic import because this module is ESM-only
        const limit = pLimit(this.settings.maxConcurrent);
        await Promise.allSettled(serviceEntities.map(serviceEntity => limit(() => this.coupleService(serviceEntity, resolveOgcDistributions, false))));
        log.info(`Finished dataset-service coupling`);
        // 3) persist leftovers
        await this.database.sendBulkCouples();
    }

    async coupleService(serviceEntity: RecordEntity, resolveOgcDistributions: boolean, coupleSelf = false) {
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
                        let distribution: Distribution = MiscUtils.structuredClone(service);
                        if (resolveOgcDistributions) {
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
                            distribution.resolvedGeometry = spatial;
                            if (errors.length) {
                                distribution.errors ??= [];
                                distribution.errors.push(...errors);
                            }
                        }
                        // if (spatial) {
                        let coupling: CouplingEntity = {
                            dataset_identifier: identifier,
                            service_id: serviceEntity.id,
                            service_type: serviceType,
                            distribution
                        };
                        await this.database.addEntityToBulk(coupling);
                        // }
                        // else {
                        //     log.warn(`Did not fetch WFS from ${serviceEntity.identifier}: ${errors.join(', ')}`);
                        // }
                    }
                    break;
                case 'WMS':
                    for (let identifier of service.operates_on) {
                        let distribution: Distribution = MiscUtils.structuredClone(service);
                        if (resolveOgcDistributions) {
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
                            distribution.mapLayerNames = layerNames;
                        }
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

    protected async postHarvestingHandling() {
        // For Profile specific Handling
    }

    async handleHarvest(delegate: RequestDelegate): Promise<void> {
        log.info('Requesting next records, starting at', delegate.getStartRecordIndex());
        let harvestStart = Date.now();
        let response = await delegate.doRequest();
        let requestingTime = Math.floor((Date.now() - harvestStart) / 1000);
        log.info(`Finished requesting batch from ${delegate.getStartRecordIndex().toString().padStart(6, ' ')}, ${requestingTime.toString().padStart(3, ' ')}s`);
        let processingStart = Date.now();

        let responseDom = this.domParser.parseFromString(response);
        let resultsNode = responseDom.getElementsByTagNameNS(namespaces.CSW, 'SearchResults')[0];
        if (resultsNode) {
            let numReturned = resultsNode.getAttribute('numberOfRecordsReturned');
            log.debug(`Received ${numReturned} records from ${this.settings.sourceURL}`);
            let importedDocuments = await this.extractRecords(response, processingStart);
            await this.updateRecords(importedDocuments, this.generalInfo['catalog'].id);
            let processingTime = Math.floor((Date.now() - processingStart) / 1000);
            log.info(`Finished processing batch from ${delegate.getStartRecordIndex().toString().padStart(6, ' ')}, ${processingTime.toString().padStart(3, ' ')}s`);
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

            let doc: IndexDocument;
            try {
                doc = await this.profile.getIndexDocumentFactory(mapper).create();
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
                    source: this.settings.sourceURL,
                    collection_id: (await this.database.getCatalog(this.settings.catalogId)).id,
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

    protected createRequestConfig(additionalSettings: Partial<CswSettings> = null, request = 'GetRecords'): RequestOptions {
        let settings = {
            ...this.settings,
            ...additionalSettings
        }
        let requestConfig: RequestOptions = {
            method: settings.httpMethod || "GET",
            uri: settings.sourceURL,
            json: false,
            headers: RequestDelegate.cswRequestHeaders(),
            proxy: settings.proxy || null,
            rejectUnauthorized: settings.rejectUnauthorizedSSL,
            timeout: settings.timeout
        };

        if (settings.httpMethod === "POST") {
            if (request === 'GetRecords') {
                requestConfig.uri = this.getRecordsURL;
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
            else if (request == 'GetCapabilities') {
                requestConfig.body = `<?xml version="1.0" encoding="UTF-8"?>
                <GetCapabilities xmlns="${namespaces.CSW}"
                            xmlns:ows="${namespaces.OWS}"
                            service="CSW">
                    <ows:AcceptVersions>
                        <ows:Version>2.0.2</ows:Version>
                    </ows:AcceptVersions>
                </GetCapabilities>`;
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
            else if (request == 'GetCapabilities') {
                requestConfig.qs ??= {};
                requestConfig.qs['service'] ??= 'CSW';
                requestConfig.qs['request'] ??= 'GetCapabilities';
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
