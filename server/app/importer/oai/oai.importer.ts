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

import * as xpath from 'xpath';
import * as MiscUtils from '../../utils/misc.utils.js';
import { createRequire } from 'module';
import type { OaiSettings } from './oai.settings.js';
import { defaultOAISettings } from './oai.settings.js';
import log4js from 'log4js';
import type { OaiXPaths } from './oai.paths.js';
import { oaiXPaths } from './oai.paths.js';
import type { DOMParser } from '@xmldom/xmldom';
import { Importer } from '../importer.js';
import type { ImportLogMessage} from '../../model/import.result.js';
import { ImportResult } from '../../model/import.result.js';
import type { IndexDocument } from '../../model/index.document.js';
import type { Observer } from 'rxjs';
import type { ProfileFactory } from '../../profiles/profile.factory.js';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader.js';
import type { RecordEntity } from '../../model/entity.js';
import type { RequestOptions } from '../../utils/http-request.utils.js';
import { RequestDelegate } from '../../utils/http-request.utils.js';
import type { BaseMapper } from '../../importer/base.mapper.js';

const log = log4js.getLogger(import.meta.filename);
const logRequest = log4js.getLogger('requests');

export class OaiImporter extends Importer {

    protected domParser: DOMParser;
    protected profile: ProfileFactory<BaseMapper>;
    protected requestDelegate: RequestDelegate;
    protected readonly settings: OaiSettings;

    private xpaths: OaiXPaths;

    private totalRecords = 0;
    private numIndexDocs = 0;

    private OaiMapper;

    constructor(settings, requestDelegate?: RequestDelegate) {
        super(settings);

        this.profile = ProfileFactoryLoader.get();
        this.domParser = MiscUtils.getDomParser();

        // merge default settings with configured ones
        settings = MiscUtils.merge(defaultOAISettings, settings);

        if (requestDelegate) {
            this.requestDelegate = requestDelegate;
        }
        else {
            let requestConfig = OaiImporter.createRequestConfig(settings);
            this.requestDelegate = new RequestDelegate(requestConfig);
        }
        this.settings = settings;
        this.xpaths = oaiXPaths[this.settings.metadataPrefix?.toLowerCase()];
    }

    // only here for documentation - use the "default" exec function
    async exec(observer: Observer<ImportLogMessage>): Promise<void> {
        await super.exec(observer);
    }

    protected async harvest(): Promise<number> {
        while (true) {
            try {
                log.debug('Requesting next records');
                let response = await this.requestDelegate.doRequest();
                let harvestTime = new Date(Date.now());

                let responseDom = this.domParser.parseFromString(response, 'application/xml');
                let resultsNode = responseDom.getElementsByTagName('ListRecords')[0];
                if (!resultsNode) {
                    throw new Error('Could not find ListRecords node in response DOM:\n' + responseDom?.toString());
                }

                let numReturned = resultsNode.getElementsByTagName('record').length;
                log.debug(`Received ${numReturned} records from ${this.settings.sourceURL}`);
                await this.extractRecords(responseDom, harvestTime);

                let resumptionTokenNode = resultsNode.getElementsByTagName('resumptionToken')[0];
                let resumptionToken = resumptionTokenNode?.textContent;
                if (resumptionTokenNode) {
                    this.totalRecords = parseInt(resumptionTokenNode.getAttribute('completeListSize'));
                    let cursor = resumptionTokenNode.getAttribute('cursor');
                    log.info(`Next cursor: ${cursor}/${this.totalRecords}`);
                }
                if (!resumptionToken) {
                    break;
                }
                let requestConfig = OaiImporter.createRequestConfig(this.settings, resumptionToken);
                this.requestDelegate = new RequestDelegate(requestConfig);
            }
            catch (e) {
                if (e.message?.startsWith('Could not find ListRecords node in response DOM')) {
                    throw e;
                }
                const message = `Error while fetching OAI Records. Will continue to try and fetch next records, if any.\nServer response: ${MiscUtils.truncateErrorMessage(e.message)}.`;
                log.error(message);
                this.summary.appErrors.push(message);
            }
        }
        this.database.sendBulkData();

        return this.numIndexDocs;
    }

    async extractRecords(xml: Document, harvestTime) {
        let promises = [];
        let records: HTMLCollectionOf<Element> = xml.getElementsByTagName('record');

        for (let i = 0; i < records.length; i++) {
            this.summary.numDocs++;
            let header = records[i].getElementsByTagName('header').item(0);
            const uuid = MiscUtils.substringAfterLast((xpath.useNamespaces(this.xpaths.prefixMap)(this.xpaths.idElem, header, true) as Node)?.textContent, ':', true);

            let isDeleted: boolean = header.attributes.getNamedItem('status')?.textContent == 'deleted';
            if (!this.filterUtils.isIdAllowed(uuid) || isDeleted) {
                this.summary.skippedDocs.push(uuid);
                continue;
            }
            let record = records[i].getElementsByTagNameNS(this.xpaths.nsPrefix, this.xpaths.mdRoot).item(0);

            if (log.isDebugEnabled()) {
                log.debug(`Import document ${i + 1} from ${records.length}`);
            }
            if (logRequest.isDebugEnabled()) {
                logRequest.debug("Record content: ", record.toString());
            }

            let mapper = await this.getMapper(this.settings, header, record, harvestTime, this.summary);

            let doc: IndexDocument;
            try {
                doc = await this.profile.getIndexDocumentFactory(mapper).create();
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
            }
            else {
                this.summary.skippedDocs.push(uuid);
            }
            this.observer.next(ImportResult.running(++this.numIndexDocs, this.totalRecords));
        }
        await Promise.allSettled(promises).catch(err => log.error('Error indexing OAI record', err));
    }

    async getMapper(settings, header, record, harvestTime, summary) {
        if (!this.OaiMapper) {
            this.OaiMapper = (await import(`./${this.settings.metadataPrefix}/oai.mapper.js`)).OaiMapper;
        }
        return new this.OaiMapper(settings, header, record, harvestTime, summary);
    }

    static createRequestConfig(settings: OaiSettings, resumptionToken?: string): RequestOptions {
        let requestConfig: RequestOptions = {
            method: "GET",
            uri: settings.sourceURL,
            json: false,
            headers: RequestDelegate.cswRequestHeaders(),
            proxy: settings.proxy || null,
            rejectUnauthorized: settings.rejectUnauthorizedSSL,
            timeout: settings.timeout
        };

        if (!resumptionToken) {
            requestConfig.qs = {
                verb: 'ListRecords',
                metadataPrefix: settings.metadataPrefix,
                set: settings.set ?? ''
            };
            if (settings.from) {
                requestConfig.qs.from = settings.from;
            }
            if (settings.until) {
                requestConfig.qs.until = settings.until;
            }
        }
        else {
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
}
