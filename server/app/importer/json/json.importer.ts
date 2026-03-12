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

import log4js from 'log4js';
import type { Observer } from 'rxjs';
import type { RecordEntity } from '../../model/entity.js';
import type { ImportLogMessage } from '../../model/import.result.js';
import { ImportResult } from '../../model/import.result.js';
import type { IndexDocument } from '../../model/index.document.js';
import type { BulkResponse } from '../../persistence/elastic.utils.js';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader.js';
import type { RequestOptions } from '../../utils/http-request.utils.js';
import { RequestDelegate } from '../../utils/http-request.utils.js';
import * as MiscUtils from '../../utils/misc.utils.js';
import { Importer } from '../importer.js';
import { JsonMapper } from './json.mapper.js';
import type { JsonSettings } from './json.settings.js';

const log = log4js.getLogger(import.meta.filename);
const logRequest = log4js.getLogger('requests');

export class JsonImporter extends Importer<JsonSettings> {

    private totalRecords = 0;
    private numIndexDocs = 0;

    constructor(settings: JsonSettings) {
        super(settings);
    }

    // only here for documentation - use the "default" exec function
    async exec(observer: Observer<ImportLogMessage>): Promise<void> {
        await super.exec(observer);
    }

    protected async preHarvestingHandling() {
        // For Profile specific Handling
    }

    /**
     * Harvest method implementation
     * NOTE Any error added to summary.appErrors will cause a database transaction rollback!
     * @returns number
     */
    protected async harvest(): Promise<number> {
        log.info(`Started requesting records`);

        await this.preHarvestingHandling();

        const requestConfig = JsonImporter.createRequestConfig(this.getSettings());
        const requestDelegate = new RequestDelegate(requestConfig);
        let harvestTime = new Date(Date.now());
        let response = await requestDelegate.doRequest();

        let numReturned = response?.length;
        if (numReturned) {
            log.debug(`Received ${numReturned} records from ${this.getSettings().sourceURL}`);
            await this.extractRecords(response, harvestTime);
            
            let processingTime = Math.floor((Date.now() - harvestTime.getTime()) / 1000);
            log.info(`Finished processing ${numReturned} records in ${processingTime} seconds`);
        }
        else {
            const message = `Error while fetching ClickRhein Records\nServer response: ${MiscUtils.truncateErrorMessage(response?.toString())}.`;
            log.error(message);
            this.getSummary().appErrors.push(message);
        }

        log.info(`Finished requesting records`);

        // persist leftovers
        await this.database.sendBulkData();

        return this.numIndexDocs;
    }

    protected async extractRecords(records: object[], harvestTime: Date): Promise<void> {
        const promises: Promise<BulkResponse>[] = [];
        for (let record of records) {
            this.getSummary().numDocs++;
            let id = record[this.getSettings().idProperty];
            if (!this.filterUtils.isIdAllowed(id)) {
                this.getSummary().skippedDocs.push(id);
            }
            else {
                if (log.isDebugEnabled()) {
                    log.debug(`Import document "${id}"`);
                }
                if (logRequest.isDebugEnabled()) {
                    logRequest.debug("Record content: ", JSON.stringify(record));
                }

                const mapper = (await ProfileFactoryLoader.get().getMapper(this.getSettings(), harvestTime, this.getSummary(), record)) as JsonMapper;

                let doc: IndexDocument;
                try {
                    doc = await mapper.createEsDocument();
                }
                catch (e) {
                    log.warn('Error creating index document', e);
                    this.getSummary().warnings.push(['Indexing error', e.toString()]);
                    mapper.skipped = true;
                }

                if (!this.getSettings().dryRun && !mapper.shouldBeSkipped()) {
                    let entity: RecordEntity = {
                        identifier: id,
                        source: this.getSettings().sourceURL,
                        collection_id: (await this.database.getCatalog(this.getSettings().catalogId)).id,
                        dataset: doc,
                        original_document: mapper.getHarvestedData()
                    };
                    promises.push(this.database.addEntityToBulk(entity));
                }
                else {
                    this.getSummary().skippedDocs.push(id);
                }
                this.observer.next(ImportResult.running(++this.numIndexDocs, this.totalRecords));
            }
        }
        await Promise.allSettled(promises).catch(e => log.error('Error persisting record', e));
    }

    protected static createRequestConfig(settings: JsonSettings): RequestOptions {
        const requestConfig: RequestOptions = {
            method: 'GET',
            uri: settings.sourceURL,
            json: true,
            headers: RequestDelegate.defaultRequestHeaders(),
            proxy: settings.proxy || null,
            timeout: settings.timeout
        };
        return requestConfig;
    }
}
