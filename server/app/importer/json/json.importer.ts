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
import log4js from 'log4js';
import type { BulkResponse } from '../../persistence/elastic.utils.js';
import { Importer } from '../importer.js';
import type { ImportLogMessage} from '../../model/import.result.js';
import { ImportResult } from '../../model/import.result.js';
import type { IndexDocument } from '../../model/index.document.js';
import { JsonMapper } from './json.mapper.js';
import type { JsonSettings } from './json.settings.js';
import type { Observer } from 'rxjs';
import type { ProfileFactory } from '../../profiles/profile.factory.js';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader.js';
import type { RecordEntity } from '../../model/entity.js';
import type { RequestOptions } from '../../utils/http-request.utils.js';
import { RequestDelegate } from '../../utils/http-request.utils.js';
import type { Summary } from '../../model/summary.js';

const log = log4js.getLogger(import.meta.filename);
const logRequest = log4js.getLogger('requests');

export class JsonImporter extends Importer {

    protected profile: ProfileFactory<JsonMapper>;
    protected settings: JsonSettings;

    private totalRecords = 0;
    private numIndexDocs = 0;

    constructor(settings: JsonSettings) {
        super(settings);
        this.profile = ProfileFactoryLoader.get();
        this.settings = settings;
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

        const requestConfig = JsonImporter.createRequestConfig(this.settings);
        const requestDelegate = new RequestDelegate(requestConfig);
        let harvestTime = new Date(Date.now());
        let response = await requestDelegate.doRequest();

        let numReturned = response?.length;
        if (numReturned) {
            log.debug(`Received ${numReturned} records from ${this.settings.sourceURL}`);
            await this.extractRecords(response, harvestTime);
            
            let processingTime = Math.floor((Date.now() - harvestTime.getTime()) / 1000);
            log.info(`Finished processing ${numReturned} records in ${processingTime} seconds`);
        }
        else {
            const message = `Error while fetching ClickRhein Records\nServer response: ${MiscUtils.truncateErrorMessage(response?.toString())}.`;
            log.error(message);
            this.summary.appErrors.push(message);
        }

        log.info(`Finished requesting records`);

        // persist leftovers
        await this.database.sendBulkData();

        return this.numIndexDocs;
    }

    protected async extractRecords(records: object[], harvestTime: Date): Promise<void> {
        const promises: Promise<BulkResponse>[] = [];
        for (let record of records) {
            this.summary.numDocs++;
            let id = record[this.settings.idProperty];
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
        }
        await Promise.allSettled(promises).catch(e => log.error('Error persisting record', e));
    }

    getMapper(settings: JsonSettings, record: object, harvestTime: Date, summary: Summary): JsonMapper {
        return new JsonMapper(settings, record, harvestTime, summary);
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
