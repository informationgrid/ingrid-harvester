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
import { defaultKldSettings, KldSettings } from './kld.settings';
import { getLogger } from 'log4js';
import { BulkResponse } from '../../persistence/elastic.utils';
import { RecordEntity } from '../../model/entity';
import { KldMapper } from './kld.mapper';
import { DOMParser } from '@xmldom/xmldom';
import { Importer } from '../importer';
import { ImportLogMessage, ImportResult } from '../../model/import.result';
import { Observer } from 'rxjs';
import { ProfileFactory } from '../../profiles/profile.factory';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader';
import { RequestDelegate, RequestOptions } from '../../utils/http-request.utils';
import { Summary } from '../../model/summary';
import { SummaryService } from '../../services/config/SummaryService';
import { ObjectListRequestParams, ObjectListResponse, ObjectResponse, PAGE_SIZE } from './kld.api';

const log = getLogger(__filename);
const logRequest = getLogger('requests');

export class KldImporter extends Importer {

    protected domParser: DOMParser;
    protected profile: ProfileFactory<KldMapper>;
    protected readonly settings: KldSettings;

    private totalRecords = 0;
    private numIndexDocs = 0;

    private minimumUpdateDate = null;

    private readonly maxRequestRetries = 3;
    private readonly requestRetryDelay = 1000;

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
                if (this.numIndexDocs > 0) {
                    if (this.summary.databaseErrors.length == 0) {
                        await this.database.commitTransaction();
                        await this.database.pushToElastic3ReturnOfTheJedi(this.elastic, this.settings.providerUrl);
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
                    log.error('No results during import - Keep old index');
                    observer.next(ImportResult.complete(this.summary, 'No Results - Keep old index'));
                    observer.complete();
                }
            } catch (e) {
                this.summary.appErrors.push(e.message ? e.message : e);
                log.error('Error during import', e);
                observer.next(ImportResult.complete(this.summary, 'Error happened'));
                observer.complete();
            }
        }
    }

    protected async harvest(): Promise<void> {
        log.info(`Started requesting records`);

        // collect number of totalRecords up front, so we can harvest concurrently
        // NOTE we extract the total number of records from the first list request
        const hitsRequestConfig = KldImporter.createRequestConfig({ ...this.settings, startPosition: 0 }, 'Objekt');
        const hitsRequestDelegate = new RequestDelegate(hitsRequestConfig);
        const hitsResponse: ObjectListResponse = await hitsRequestDelegate.doRequest();
        this.totalRecords = this.settings.maxRecords ?? hitsResponse.Gesamtanzahl;

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
            const request = throttle(() => this.extractObjectIds(requestDelegate, page, numPages))();
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
            for (let id in response) {
                idMap[id] = response[id];
                numAddedIds++;
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
            return;
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
                const request = throttle(() => this.extractObjectDetails(requestDelegate, i, numReceived))();
                detailRequests.push(request);
            }
        }
        await Promise.allSettled(detailRequests);

        // TODO delete objects not contained in the current list?

        log.info(`Finished requesting records`);
        // 3) persist leftovers
        await this.database.sendBulkData();
    }

    protected async extractObjectIds(delegate: RequestDelegate, index: number, total: number): Promise<Record<string, string>> {
      const counter = KldImporter.formatCounter(index, total);
      const requestUrl = delegate.getFullURL();
        log.info(`${counter} Requesting records from page (${requestUrl})`);
        try {
            const response: ObjectListResponse = await this.requestWithRetries<ObjectListResponse>(delegate, (r: ObjectListResponse) => r?.Ergebnis !== undefined);
            if (logRequest.isDebugEnabled()) {
                logRequest.debug(`${counter} Response content: `, JSON.stringify(response));
            }
            const ids = response.Ergebnis?.reduce((result: Record<string, string>, obj) => {
                result[obj.Id] = obj.ZuletztGeaendert;
                return result;
            }, {});
            if (log.isDebugEnabled()) {
                log.debug(`${counter} Received ${Object.keys(ids).length} record ids from ${requestUrl}`);
            }
            return ids;
        }
        catch (e) {
            const message = `Error while fetching page: ${MiscUtils.truncateErrorMessage(e)}.`;
            log.error('Error while fetching page', e);
            this.summary.appErrors.push(message);
            throw e;
        }
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
          log.debug(`${counter} Received record with id "${id}"`);
          let importedDocument = await this.extractRecord(response, harvestTime);
          await this.updateRecord(importedDocument);
          let processingTime = Math.floor((Date.now() - harvestTime.getTime()) / 1000);
          log.info(`${counter} Finished processing record with id "${id}", ${processingTime.toString().padStart(3, ' ')}s`);
      }
      catch (e) {
          const message = `Error while fetching record details: ${MiscUtils.truncateErrorMessage(e)}.`;
          log.error('Error while fetching record details', e);
          this.summary.appErrors.push(message);
          throw e;
      }
  }

    protected async postHarvestingHandling(){
        // For Profile specific Handling
    }

    protected async extractRecord(record: ObjectResponse, harvestTime: Date): Promise<string> {
        const promises: Promise<BulkResponse>[] = [];
        const id = record.Id;

        let docToImport = null;
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

            let doc: any;
            try {
                doc = await this.profile.getIndexDocument().create(mapper);
                docToImport = doc;
            }
            catch (e) {
                log.error('Error creating index document', e);
                this.summary.appErrors.push(e.toString());
                mapper.skipped = true;
            }

            if (!this.settings.dryRun && !mapper.shouldBeSkipped()) {
                let entity: RecordEntity = {
                    identifier: id,
                    source: this.settings.providerUrl,
                    collection_id: this.database.defaultCatalog.id,
                    dataset: doc,
                    original_document: mapper.getHarvestedData()
                };
                promises.push(this.database.addEntityToBulk(entity));
            } else {
                this.summary.skippedDocs.push(id);
            }
            this.observer.next(ImportResult.running(++this.numIndexDocs, this.totalRecords));
        }

        await Promise.allSettled(promises).catch(e => log.error('Error persisting record', e));
        return docToImport;
    }

    /**
     * Is called after a record has been added to the bulk persisting queue.
     * It might not necessarily have been persisted yet.
     */
    protected async updateRecord(documents: any) {
        // For Profile specific Handling
    }

    protected getMapper(settings: KldSettings, record: ObjectResponse, harvestTime: Date, summary: Summary): KldMapper {
        return new KldMapper(settings, record, harvestTime, summary);
    }

    private static createRequestConfig(settings: KldSettings, operation: string, params?: Record<string, any>): RequestOptions {
        const requestConfig: RequestOptions = {
            method: 'GET',
            uri: settings.providerUrl + operation,
            json: true,
            headers: RequestDelegate.defaultRequestHeaders(),
            proxy: settings.proxy || null,
            timeout: settings.timeout,
            qs: params,
        };
        return requestConfig;
    }

    private static formatCounter(index: number, total: number): string {
      const length = total.toString().length;
      return `[${(index+1).toString().padStart(length, '0')}/${total}]`;
    }

    private static async sleep(milliseconds: number): Promise<void> {
        return new Promise((resolve) => { setTimeout(resolve, milliseconds); });
    }

    private async requestWithRetries<T = ObjectListResponse|ObjectResponse>(delegate: RequestDelegate, success: (response: T) => boolean): Promise<T> {
        let retry = this.maxRequestRetries;
        let response: T = await delegate.doRequest(this.maxRequestRetries, this.requestRetryDelay);
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
                    response = await delegate.doRequest(this.maxRequestRetries, this.requestRetryDelay);
                }
            }
        } while (retry > 0);
        throw Error(`Request for ${delegate.getFullURL()} failed with ${this.maxRequestRetries} retries. Last response: ${MiscUtils.truncateErrorMessage(JSON.stringify(response))}`);
    }

    getSummary(): Summary {
        return this.summary;
    }
}
