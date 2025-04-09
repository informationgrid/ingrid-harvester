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
import { getLogger } from 'log4js';
import { BulkResponse } from '../../persistence/elastic.utils';
import { Importer } from '../importer';
import { ImportLogMessage, ImportResult } from '../../model/import.result';
import { IndexDocument } from '../../model/index.document';
import { JsonMapper } from './json.mapper';
import { JsonSettings } from './json.settings';
import { Observer } from 'rxjs';
import { ProfileFactory } from '../../profiles/profile.factory';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader';
import { RecordEntity } from '../../model/entity';
import { RequestDelegate, RequestOptions } from '../../utils/http-request.utils';
import { Summary } from '../../model/summary';

const log = getLogger(__filename);
const logRequest = getLogger('requests');

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

    getSummary(): Summary {
        return this.summary;
    }
}
