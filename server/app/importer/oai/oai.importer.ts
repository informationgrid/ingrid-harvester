/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2022 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

import {DefaultElasticsearchSettings, ElasticSearchUtils} from '../../utils/elastic.utils';
import {elasticsearchMapping} from '../../elastic.mapping';
import {elasticsearchSettings} from '../../elastic.settings';
import {OaiMapper} from './oai.mapper';
import {Summary} from '../../model/summary';
import {getLogger} from 'log4js';
import {CswParameters, RequestDelegate, RequestPaging} from '../../utils/http-request.utils';
import {OptionsWithUri} from 'request-promise';
import {DefaultImporterSettings, Importer} from '../../importer';
import {Observable, Observer} from 'rxjs';
import {ImportLogMessage, ImportResult} from '../../model/import.result';
import {OaiSettings} from './oai.settings';
import {FilterUtils} from "../../utils/filter.utils";
import { MiscUtils } from '../../utils/misc.utils';
import {ProfileFactory} from "../../profiles/profile.factory";

let log = require('log4js').getLogger(__filename),
    logSummary = getLogger('summary'),
    logRequest = getLogger('requests'),
    DomParser = require('@xmldom/xmldom').DOMParser;

export class OaiSummary extends Summary {
    opendata = 0;
    missingLinks = 0;
    missingPublishers = 0;
    missingLicense = 0;
    ok = 0;

    additionalSummary() {
        logSummary.info(`Number of records with at least one mandatory keyword: ${this.opendata}`);
        logSummary.info(`Number of records with missing links: ${this.missingLinks}`);
        logSummary.info(`Number of records with missing license: ${this.missingLicense}`);
        logSummary.info(`Number of records with missing publishers: ${this.missingPublishers}`);
        logSummary.info(`Number of records imported as valid: ${this.ok}`);
    }
}

export class OaiImporter implements Importer {
    private profile: ProfileFactory;
    private readonly settings: OaiSettings;
    elastic: ElasticSearchUtils;
    private requestDelegate: RequestDelegate;

    private totalRecords = 0;
    private numIndexDocs = 0;

    static defaultSettings: OaiSettings = {
        ...DefaultElasticsearchSettings,
        ...DefaultImporterSettings,
        providerUrl: '',
        eitherKeywords: [],
        set: ''
    };

    private readonly summary: OaiSummary;
    private filterUtils: FilterUtils;

    run = new Observable<ImportLogMessage>(observer => {
        this.observer = observer;
        this.exec(observer);
    });

    private observer: Observer<ImportLogMessage>;

    constructor(profile: ProfileFactory, settings, requestDelegate?: RequestDelegate) {
        this.profile = profile;

        // merge default settings with configured ones
        settings = MiscUtils.merge(OaiImporter.defaultSettings, settings);

        if (requestDelegate) {
            this.requestDelegate = requestDelegate;
        } else {
            let requestConfig = OaiImporter.createRequestConfig(settings);
            this.requestDelegate = new RequestDelegate(requestConfig);
        }

        this.settings = settings;
        this.filterUtils = new FilterUtils(settings);

        this.summary = new OaiSummary(settings);

        this.elastic = new ElasticSearchUtils(settings, this.summary);
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
                await this.elastic.prepareIndex(elasticsearchMapping, elasticsearchSettings);
                await this.harvest();
                await this.elastic.sendBulkData(false);
                await this.elastic.finishIndex();
                observer.next(ImportResult.complete(this.summary));
                observer.complete();

            } catch (err) {
                this.summary.appErrors.push(err.message ? err.message : err);
                log.error('Error during OAI import', err);
                observer.next(ImportResult.complete(this.summary, 'Error happened'));
                observer.complete();

                // clean up index
                this.elastic.deleteIndex(this.elastic.indexName);
            }
        }
    }

    async harvest() {

        while (true) {
            log.debug('Requesting next records');
            let response = await this.requestDelegate.doRequest();
            let harvestTime = new Date(Date.now());

            let resumptionToken;

            let responseDom = new DomParser().parseFromString(response);
            let resultsNode = responseDom.getElementsByTagName('ListRecords')[0];
            if (resultsNode) {
                let numReturned = resultsNode.getElementsByTagName('record').length;

                let resumptionTokenNode = resultsNode.getElementsByTagName('resumptionToken')[0];
                if (resumptionTokenNode) {
                    this.totalRecords = resumptionTokenNode.getAttribute('completeListSize');
                    resumptionToken = resumptionTokenNode.textContent;
                }

                log.debug(`Received ${numReturned} records from ${this.settings.providerUrl}`);
                await this.extractRecords(response, harvestTime)
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

    }

    async extractRecords(getRecordsResponse, harvestTime) {
        let promises = [];
        let xml = new DomParser().parseFromString(getRecordsResponse, 'application/xml');
        let records = xml.getElementsByTagNameNS(OaiMapper.GMD, 'MD_Metadata');
        let ids = [];
        for (let i = 0; i < records.length; i++) {
            ids.push(OaiMapper.getCharacterStringContent(records[i], 'fileIdentifier'));
        }

        let now = new Date(Date.now());
        let storedData;

        if (this.settings.dryRun) {
            storedData = ids.map(() => now);
        } else {
            storedData = await this.elastic.getStoredData(ids);
        }

        for (let i = 0; i < records.length; i++) {
            this.summary.numDocs++;

            const uuid = OaiMapper.getCharacterStringContent(records[i], 'fileIdentifier');
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

            let mapper = this.getMapper(this.settings, records[i], harvestTime, storedData[i], this.summary);

            let doc: any = await this.profile.getIndexDocument().create(mapper).catch(e => {
                log.error('Error creating index document', e);
                this.summary.appErrors.push(e.toString());
                mapper.skipped = true;
            });

            if (!mapper.shouldBeSkipped()) {

                if (doc.extras.metadata.isValid && doc.distribution.length > 0) {
                    this.summary.ok++;
                }

                if (!this.settings.dryRun) {
                    promises.push(
                        this.elastic.addDocToBulk(doc, uuid)
                            .then(response => {
                                if (!response.queued) {
                                    // numIndexDocs += ElasticSearchUtils.maxBulkSize;
                                    // this.observer.next(ImportResult.running(numIndexDocs, records.length));
                                }
                            })
                    );
                }

            } else {
                this.summary.skippedDocs.push(uuid);
            }
            this.observer.next(ImportResult.running(++this.numIndexDocs, this.totalRecords));
        }
        await Promise.all(promises)
            .catch(err => log.error('Error indexing OAI record', err));
    }

    getMapper(settings, record, harvestTime, storedData, summary): OaiMapper {
        return new OaiMapper(settings, record, harvestTime, storedData, summary);
    }

    static createRequestConfig(settings: OaiSettings, resumptionToken?: string): OptionsWithUri {
        let requestConfig: OptionsWithUri = {
            method: "GET",
            uri: settings.providerUrl,
            json: false,
            headers: RequestDelegate.cswRequestHeaders(),
            proxy: settings.proxy || null
        };

        if (!resumptionToken) {
            requestConfig.qs = {
                verb: 'ListRecords',
                metadataPrefix: 'iso19139',
                set: settings.set,
            };
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
