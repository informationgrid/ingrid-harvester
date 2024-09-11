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

import * as MiscUtils from '../../utils/misc.utils';
import { defaultKldSettings, KldSettings } from './kld.settings';
import { getLogger } from 'log4js';
import { existsSync, mkdirSync, mkdtemp, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { BulkResponse } from '../../persistence/elastic.utils';
import { DOMParser } from '@xmldom/xmldom';
import { Importer } from '../importer';
import { ImportLogMessage, ImportResult } from '../../model/import.result';
import { IndexDocument } from '../../model/index.document';
import { KldMapper } from './kld.mapper';
import { ObjectListRequestParams, ObjectListResponse, ObjectResponse, PAGE_SIZE } from './kld.api';
import { Observer } from 'rxjs';
import { ProfileFactory } from '../../profiles/profile.factory';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader';
import { RecordEntity } from '../../model/entity';
import { RequestDelegate, RequestOptions } from '../../utils/http-request.utils';
import { Summary } from '../../model/summary';
import { SummaryService } from '../../services/config/SummaryService';

const log = getLogger(__filename);
const logRequest = getLogger('requests');

const STORE_RESPONSES: boolean = false;

export class KldImporter extends Importer {

    protected domParser: DOMParser;
    protected profile: ProfileFactory<KldMapper>;
    protected settings: KldSettings;

    private totalRecords = 0;
    private numIndexDocs = 0;

    private minimumUpdateDate = null;

    private responseStorageFolder = null;

    // TODO put into configuration?
    private readonly maxRequestRetries = 3;
    private readonly requestRetryDelay = 3000;

    constructor(settings: KldSettings) {
        super(settings);

        this.profile = ProfileFactoryLoader.get();
        this.domParser = MiscUtils.getDomParser();

        // merge default settings with configured ones
        settings = MiscUtils.merge(defaultKldSettings, settings);

        // if we are looking for incremental updates, set the last execution date
        // TODO how to set incremental?
        if (settings.isIncremental) {
            let sumser: SummaryService = new SummaryService();
            let summary: ImportLogMessage = sumser.get(settings.id);
            // only do an incremental harvest if there exists a previous run
            if (summary) {
                this.minimumUpdateDate = new Date(summary.lastExecution);
            }
            else {
                log.warn(`Changing type of harvest to "full" because no previous harvest was found for harvester with id ${settings.id}`);
                settings.isIncremental = false;
            }
        }
        this.settings = settings;
    }

    // only here for documentation - use the "default" exec function
    async exec(observer: Observer<ImportLogMessage>): Promise<void> {
        await super.exec(observer);
    }

    /**
     * Harvest method implementation
     * NOTE Any error added to summary.appErrors will cause a database transaction rollback!
     * @returns number
     */
    protected async harvest(): Promise<number> {
        log.info(`Started requesting records`);

        if (STORE_RESPONSES) {
            const basePath = join(tmpdir(), 'kld-import');
            if (!existsSync(basePath)) {
                mkdirSync(basePath);
            }
            mkdtemp(join(basePath, `${(new Date().toJSON().slice(0,10))}-`), (err, folder) => {
                if (err) {
                    throw err;
                }
                this.responseStorageFolder = folder;
                log.info(`Storing server responses in: ${this.responseStorageFolder}`);
            });
        }

        // collect number of totalRecords up front, so we can harvest concurrently
        if (this.settings.maxRecords && !isNaN(this.settings.maxRecords)) {
          this.totalRecords = this.settings.maxRecords;
        }
        else {
          // extract the total number of records from the first list request
          const hitsRequestConfig = KldImporter.createRequestConfig({ ...this.settings, startPosition: 0 }, 'Objekt');
          const hitsRequestDelegate = new RequestDelegate(hitsRequestConfig);
          try {
              const hitsResponse: ObjectListResponse = await this.requestWithRetries(hitsRequestDelegate);
              this.totalRecords = hitsResponse.Gesamtanzahl;
          }
          catch (e) {
              const message = `Received empty response when requesting total number of objects. Skipping import.`;
              log.error(message);
              this.summary.appErrors.push(message);
              return 0;
          }
        }
        log.info(`Number of records to fetch: ${this.totalRecords}`);

        // setup concurrency
        const pThrottle = (await import('p-throttle')).default; // use dynamic import because this module is ESM-only
        const throttle = pThrottle({
            limit: this.settings.maxConcurrent,
            interval: this.settings.maxConcurrentTimespan,
        });

        // extract all object ids with their latest change dates

        // create paged requests
        const listRequests = [];
        const numPages = Math.ceil(this.totalRecords / PAGE_SIZE);
        const defaultListParams: ObjectListRequestParams = {
            Seite: 0,
            SortierModus: 'Aenderungsdatum',
            Sortierrichtung: 'Absteigend',
        };
        let numRequested = 0;
        for (let page = 0; page < numPages && numRequested < this.totalRecords; page++) {
            const params: ObjectListRequestParams = { ...defaultListParams, Seite: page };
            const requestDelegate = new RequestDelegate(KldImporter.createRequestConfig(this.settings, 'Objekt', params));
            const request = throttle(() => {
                return this.extractObjectIds(requestDelegate, page, numPages);
            })();
            listRequests.push(request);
            numRequested += PAGE_SIZE;
        }
        // run in parallel
        const idMap: Record<string, string> = {};
        const results: PromiseSettledResult<any>[] = await Promise.allSettled(listRequests);
        let numAddedIds = 0;
        collectIds:
        for (let i = 0, count = results.length; i < count; i++) {
            const response = (results[i] as PromiseFulfilledResult<Record<string, string>>).value;
            log.debug(`Number of records received from page ${i}: ${Object.keys(response).length}`);
            for (let id in response) {
                if (id in idMap) {
                    const message = `Record with id ${id} was already received. Skipping record.`;
                    log.warn(message);
                    this.summary.warnings.push([message]);
                    this.totalRecords--;
                }
                else {
                    idMap[id] = response[id];
                    numAddedIds++;
                }
                if (numAddedIds >= this.totalRecords) {
                    break collectIds;
                }
            }
        };

        // check if number of received objects matches number of expected objects
        const ids = Object.keys(idMap);
        const numReceived = ids.length;
        if (numReceived < this.totalRecords) {
            const message = `Received less records than expected ${numReceived}/${this.totalRecords}. Skipping import.`;
            log.error(message);
            this.summary.appErrors.push(message);
            return 0;
        }

        // wait before doing detail requests
        await KldImporter.sleep(this.settings.maxConcurrentTimespan);

        // store details for all objects, take minimumUpdateDate into account for incremental harvesting
        const detailRequests = [];
        for (let i = 0; i < numReceived; i++) {
            const objectId = ids[i];
            const lastUpdateDate = new Date(idMap[objectId]);
            if (!this.settings.isIncremental || lastUpdateDate < this.minimumUpdateDate) {
                const requestDelegate = new RequestDelegate(KldImporter.createRequestConfig(this.settings, `Objekt/${ids[i]}`));
                const request = throttle(() => {
                    return this.extractObjectDetails(requestDelegate, i, numReceived)
                })();
                detailRequests.push(request);
            }
        }
        await Promise.allSettled(detailRequests);

        log.info(`Finished requesting records`);

        // persist leftovers
        await this.database.sendBulkData();

        return this.numIndexDocs;
    }

    protected async extractObjectIds(delegate: RequestDelegate, index: number, total: number): Promise<Record<string, string>> {
        const counter = KldImporter.formatCounter(index, total);
        const requestUrl = delegate.getFullURL();
        log.info(`${counter} Requesting record ids from (${requestUrl})`);
        let ids = {};
        try {
            const response: ObjectListResponse = await this.requestWithRetries<ObjectListResponse>(delegate, (r: ObjectListResponse) => r?.Ergebnis !== undefined);
            if (logRequest.isDebugEnabled()) {
                logRequest.debug(`${counter} Response content: `, JSON.stringify(response));
            }
            ids = response.Ergebnis?.reduce((result: Record<string, string>, obj) => {
                result[obj.Id] = obj.ZuletztGeaendert;
                return result;
            }, {});
            if (log.isDebugEnabled()) {
                log.debug(`${counter} Received ${Object.keys(ids).length} record ids from ${requestUrl}`);
            }
        }
        catch (e) {
            // add an error if there is a problem when retrieving record ids to abort the import process later
            const message = `Error while fetching ids from ${requestUrl}: ${MiscUtils.truncateErrorMessage(e)}.`;
            log.error(`Error while fetching ids from ${requestUrl}`, e);
            this.summary.appErrors.push(message);
        }
        return ids;
    }

    protected async extractObjectDetails(delegate: RequestDelegate, index: number, total: number): Promise<void> {
        const counter = KldImporter.formatCounter(index, total);
        const requestUrl = delegate.getFullURL();
        log.info(`${counter} Requesting record details from ${requestUrl}`);
        try {
            const response: ObjectResponse = await this.requestWithRetries<ObjectResponse>(delegate, (r: ObjectResponse) => r?.Id !== undefined);
            if (logRequest.isDebugEnabled()) {
                logRequest.debug(`${counter} Response content: `, JSON.stringify(response));
            }
            const harvestTime = new Date(Date.now());
            const id = response.Id;
            if (STORE_RESPONSES) {
                writeFileSync(join(this.responseStorageFolder, `${id}.json`), JSON.stringify(response));
            }
            log.debug(`${counter} Received record with id "${id}"`);
            await this.extractRecord(response, harvestTime);
            let processingTime = Math.floor((Date.now() - harvestTime.getTime()) / 1000);
            log.info(`${counter} Finished processing record with id "${id}", ${processingTime.toString().padStart(3, ' ')}s`);
        }
        catch (e) {
            // add a warning only if details for a single record could not be retrieved to avoid aborting the import
            const message = `Error while fetching record details from ${requestUrl}: ${MiscUtils.truncateErrorMessage(e)}.`;
            log.warn(`Error while fetching record details from ${requestUrl}`, e);
            this.summary.warnings.push(['No details', message]);
        }
    }

    protected async extractRecord(record: ObjectResponse, harvestTime: Date): Promise<void> {
        const promises: Promise<BulkResponse>[] = [];
        const id = record.Id;

        this.summary.numDocs++;

        if (!this.filterUtils.isIdAllowed(id)) {
            this.summary.skippedDocs.push(id);
        }
        else {
            if (log.isDebugEnabled()) {
                log.debug(`Import document "${id}"`);
            }
            if (logRequest.isDebugEnabled()) {
                logRequest.debug("Record content: ", JSON.stringify(record));
            }

            const mapper = this.getMapper(this.settings, record, harvestTime, this.summary);

            let doc: IndexDocument;
            try {
                doc = await this.profile.getIndexDocumentFactory(mapper).create();
            }
            catch (e) {
                log.warn('Error creating index document', e);
                this.summary.warnings.push(['Indexing error', e.toString()]);
                mapper.skipped = true;
            }

            if (!this.settings.dryRun && !mapper.shouldBeSkipped()) {
                let entity: RecordEntity = {
                    identifier: id,
                    source: this.settings.sourceURL,
                    collection_id: (await this.database.getCatalog(this.settings.catalogId)).id,
                    dataset: doc,
                    original_document: mapper.getHarvestedData()
                };
                promises.push(this.database.addEntityToBulk(entity));
            }
            else {
                this.summary.skippedDocs.push(id);
            }
            this.observer.next(ImportResult.running(++this.numIndexDocs, this.totalRecords));
        }
        await Promise.allSettled(promises).catch(e => log.error('Error persisting record', e));
    }

    protected getMapper(settings: KldSettings, record: ObjectResponse, harvestTime: Date, summary: Summary): KldMapper {
        return new KldMapper(settings, record, harvestTime, summary);
    }

    private static formatCounter(index: number, total: number): string {
      const length = total.toString().length;
      return `[${(index+1).toString().padStart(length, '0')}/${total}]`;
    }

    private static createRequestConfig(settings: KldSettings, operation: string, params?: Record<string, any>): RequestOptions {
        // NOTE We set resolveWithFullResponse to true to receive the fetch promise from RequestDelegate directly
        // This allows for handling empty responses and timeouts correctly
        const requestConfig: RequestOptions = {
            method: 'GET',
            uri: settings.sourceURL + operation,
            json: true,
            headers: RequestDelegate.defaultRequestHeaders(),
            proxy: settings.proxy || null,
            timeout: settings.timeout,
            qs: params,
            resolveWithFullResponse: true
        };
        return requestConfig;
    }

    private async requestSingle<T = ObjectListResponse|ObjectResponse>(delegate: RequestDelegate): Promise<T|null> {
        try {
            const response: Response = await delegate.doRequest();
            return response ? await response.json() : null;
        } catch (e) {
            // ignore time out errors
            if (e.name != 'AbortError') {
                const message = e.message ? e.message : e;
                this.summary.warnings.push(['Request failure', message]);
                log.warn('Error during request', e);
            }
        }
        return null;
    }

    private async requestWithRetries<T = ObjectListResponse|ObjectResponse>(delegate: RequestDelegate,
            success: (response: T) => boolean=(r) => r != null): Promise<T> {
        let retry = this.maxRequestRetries;
        let response: T = await this.requestSingle(delegate);
        do {
            if (response && success(response)) {
                return response;
            }
            else {
                // if success condition was not met, retry
                if (logRequest.isDebugEnabled()) {
                    logRequest.debug(`Faulty response content: `, JSON.stringify(response));
                }
                if (retry > 0) {
                    retry -= 1;
                    log.info(`Retrying request for ${delegate.getFullURL()} (waiting ${this.requestRetryDelay}ms)`);
                    await KldImporter.sleep(this.requestRetryDelay);
                    response = await this.requestSingle(delegate);
                }
            }
        } while (retry > 0);

        // retries failed
        const message = `Request for ${delegate.getFullURL()} failed with ${this.maxRequestRetries} retries. Last response: ${MiscUtils.truncateErrorMessage(JSON.stringify(response))}`;
        throw Error(message);
    }

    private static async sleep(milliseconds: number): Promise<void> {
        return new Promise((resolve) => { setTimeout(resolve, milliseconds); });
    }

    getSummary(): Summary {
        return this.summary;
    }
}
