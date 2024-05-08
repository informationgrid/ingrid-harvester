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

import * as MiscUtils from '../../../utils/misc.utils';
import { defaultOAISettings, OaiSettings } from '../oai.settings';
import { getLogger } from 'log4js';
import { oaiXPaths, OaiXPaths } from '../oai.paths';
import { ConfigService } from '../../../services/config/ConfigService';
import { DOMParser } from '@xmldom/xmldom';
import { Importer } from '../../importer';
import { ImportLogMessage, ImportResult } from '../../../model/import.result';
import { MailServer } from '../../../utils/nodemailer.utils';
import { OaiMapper } from './oai.mapper';
import { Observer } from 'rxjs';
import { ProfileFactory } from '../../../profiles/profile.factory';
import { ProfileFactoryLoader } from '../../../profiles/profile.factory.loader';
import { RecordEntity } from '../../../model/entity';
import { RequestDelegate, RequestOptions } from '../../../utils/http-request.utils';
import { Summary } from '../../../model/summary';

const log = require('log4js').getLogger(__filename),
    logRequest = getLogger('requests');

export class OaiImporter extends Importer {

    protected domParser: DOMParser;
    private profile: ProfileFactory<OaiMapper>;
    private readonly settings: OaiSettings;
    private requestDelegate: RequestDelegate;
    private xpaths: OaiXPaths;

    private totalRecords = 0;
    private numIndexDocs = 0;

    constructor(settings, requestDelegate?: RequestDelegate) {
        super(settings);

        this.profile = ProfileFactoryLoader.get();
        this.domParser = MiscUtils.getDomParser();

        // merge default settings with configured ones
        settings = MiscUtils.merge(defaultOAISettings, settings);

        if (requestDelegate) {
            this.requestDelegate = requestDelegate;
        } else {
            let requestConfig = OaiImporter.createRequestConfig(settings);
            this.requestDelegate = new RequestDelegate(requestConfig);
        }
        this.settings = settings;
        this.xpaths = oaiXPaths[this.settings.metadataPrefix?.toLowerCase()];
    }

    async exec(observer: Observer<ImportLogMessage>): Promise<void> {
        if (this.settings.dryRun) {
            log.debug('Dry run option enabled. Skipping index creation.');
            await this.harvest();
            log.debug('Skipping finalisation of index for dry run.');
            observer.next(ImportResult.complete(this.summary, 'Dry run ... no indexing of data'));
            observer.complete();
        }
        else {
            try {
                let transactionTimestamp = await this.database.beginTransaction();
                // get datasets
                await this.harvest();
                // did the harvesting return results at all?
                if (this.numIndexDocs == 0 && !this.summary.isIncremental) {
                    throw new Error('No results during LIDO import');
                }
                // ensure that less than X percent of existing datasets are slated for deletion
                // TODO introduce settings to:
                // - send a mail
                // - fail or continue
                let nonFetchedPercentage = await this.database.nonFetchedPercentage(this.settings.providerUrl, transactionTimestamp);
                if (nonFetchedPercentage > ConfigService.getGeneralSettings().maxDiff) {
                    throw new Error(`Not enough coverage of previous results (${nonFetchedPercentage}%)`);
                }
                // did fatal errors occur (ie DB or APP errors)?
                if (this.summary.databaseErrors.length > 0 || this.summary.appErrors.length > 0) {
                    throw new Error();
                }

                await this.database.deleteNonFetchedDatasets(this.settings.providerUrl, transactionTimestamp);
                await this.database.commitTransaction();
                await this.database.pushToElastic3ReturnOfTheJedi(this.elastic, this.settings.providerUrl);
                observer.next(ImportResult.complete(this.summary));
            }
            catch (err) {
                if (err.message) {
                    this.summary.appErrors.push(err.message);
                }
                await this.database.rollbackTransaction();
                let msg = this.summary.appErrors.length > 0 ? this.summary.appErrors[0] : this.summary.databaseErrors[0];
                // MailServer.getInstance().send(msg, `An error occurred during harvesting: ${msg}`);
                log.error(msg);
                observer.next(ImportResult.complete(this.summary, msg));
            }
            observer.complete();
        }
    }

    async harvest() {

        while (true) {
            log.debug('Requesting next records');
            let response = await this.requestDelegate.doRequest();
            let harvestTime = new Date(Date.now());

            let resumptionToken;

            let responseDom;
            try {
                responseDom = this.domParser.parseFromString(response);
            }
            catch (e) {
                console.log(e);
            }
            let resultsNode = responseDom.getElementsByTagName('ListRecords')[0];
            if (resultsNode) {
                let numReturned = resultsNode.getElementsByTagName('record').length;

                let resumptionTokenNode = resultsNode.getElementsByTagName('resumptionToken')[0];
                if (resumptionTokenNode) {
                    this.totalRecords = parseInt(resumptionTokenNode.getAttribute('completeListSize'));
                    let cursor = resumptionTokenNode.getAttribute('cursor');
                    resumptionToken = resumptionTokenNode.textContent;
                    log.info(`Next cursor: ${cursor}/${this.totalRecords}`);
                }

                log.debug(`Received ${numReturned} records from ${this.settings.providerUrl}`);
                await this.extractRecords(response, harvestTime);
            } else {
                const message = `Error while fetching OAI Records. Will continue to try and fetch next records, if any.\nServer response: ${MiscUtils.truncateErrorMessage(responseDom.toString())}.`;
                log.error(message);
                this.summary.appErrors.push(message);
            }

            if (resumptionToken) {
                let requestConfig = OaiImporter.createRequestConfig(this.settings, resumptionToken);
                this.requestDelegate = new RequestDelegate(requestConfig);
            } else {
                break;
            }
        }
        this.database.sendBulkData();
    }

    async extractRecords(getRecordsResponse, harvestTime) {
        let promises = [];
        let xml = this.domParser.parseFromString(getRecordsResponse, 'application/xml');
        let records = xml.getElementsByTagNameNS(this.xpaths.nsPrefix, this.xpaths.mdRoot);

        let ids = [];
        for (let i = 0; i < records.length; i++) {
            ids.push(OaiMapper.select(this.xpaths.idElem, records[i], true));
        }

        for (let i = 0; i < records.length; i++) {
            this.summary.numDocs++;
            const uuid = OaiMapper.select(this.xpaths.idElem, records[i], true)?.textContent;
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

            let mapper = this.getMapper(this.settings, records[i], harvestTime, this.summary);

            let doc: any = await this.profile.getIndexDocumentFactory(mapper).create().catch(e => {
                log.error('Error creating index document', e);
                this.summary.appErrors.push(e.toString());
                mapper.skipped = true;
            });

            if (!this.settings.dryRun && !mapper.shouldBeSkipped()) {
                let entity: RecordEntity = {
                    identifier: uuid,
                    source: this.settings.providerUrl,
                    collection_id: this.database.defaultCatalog.id,
                    dataset: doc,
                    original_document: mapper.getHarvestedData()
                };
                promises.push(this.database.addEntityToBulk(entity));
            } else {
                this.summary.skippedDocs.push(uuid);
            }
            this.observer.next(ImportResult.running(++this.numIndexDocs, this.totalRecords));
        }
        await Promise.allSettled(promises).catch(err => log.error('Error indexing OAI record', err));
    }

    getMapper(settings, record, harvestTime, summary): OaiMapper {
        return new OaiMapper(settings, record, harvestTime, summary);
    }

    static createRequestConfig(settings: OaiSettings, resumptionToken?: string): RequestOptions {
        let requestConfig: RequestOptions = {
            method: "GET",
            uri: settings.providerUrl,
            json: false,
            headers: RequestDelegate.cswRequestHeaders(),
            proxy: settings.proxy || null,
            timeout: settings.timeout
        };

        if (!resumptionToken) {
            requestConfig.qs = {
                verb: 'ListRecords',
                metadataPrefix: settings.metadataPrefix,
                set: settings.set
            };
            if (settings.from) {
                requestConfig.qs.from = settings.from;
            }
            if (settings.until) {
                requestConfig.qs.until = settings.until;
            }
        } else {
            requestConfig.qs = {
                verb: 'ListRecords',
                resumptionToken: resumptionToken
            };
        }

        return requestConfig;
    }

    static createResumption(resumptionToken: string) {
        return {
            resumptionToken: resumptionToken
        }
    }

    getSummary(): Summary {
        return this.summary;
    }

}
