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

import { HttpsProxyAgent } from 'https-proxy-agent';
import log4js from 'log4js';
import plain_fetch from "node-fetch";
import type { Observer } from 'rxjs';
import SimpleClient from "sparql-http-client/SimpleClient.js";
import { DefaultImporterSettings } from '../../importer.settings.js';
import type { RecordEntity } from '../../model/entity.js';
import type { ImportLogMessage } from '../../model/import.result.js';
import { ImportResult } from '../../model/import.result.js';
import type { IndexDocument } from '../../model/index.document.js';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader.js';
import { ConfigService } from '../../services/config/ConfigService.js';
import type { RequestDelegate } from '../../utils/http-request.utils.js';
import * as MiscUtils from '../../utils/misc.utils.js';
import { Importer } from '../importer.js';
import { SparqlMapper } from './sparql.mapper.js';
import type { SparqlSettings } from './sparql.settings.js';

const log = log4js.getLogger(import.meta.filename);
const logRequest = log4js.getLogger('requests');

export class SparqlImporter extends Importer<SparqlSettings> {

    private totalRecords = 0;
    private numIndexDocs = 0;

    private generalSettings = ConfigService.getGeneralSettings();

    static defaultSettings: SparqlSettings = {
        ...DefaultImporterSettings,
        sourceURL: '',
        query: '',
        filterTags: [],
        filterThemes: []
    };

    constructor(settings: SparqlSettings) {
        // merge default settings with configured ones
        settings = MiscUtils.merge(SparqlImporter.defaultSettings, settings);
        super(settings);
    }

    // only here for documentation - use the "default" exec function
    async exec(observer: Observer<ImportLogMessage>): Promise<void> {
        await super.exec(observer);
    }

    protected async harvest(): Promise<number> {
        log.debug('Requesting records');

        let response = "";

        const endpointUrl = this.getSettings().sourceURL;

        let fetch: any = plain_fetch;

        if (this.generalSettings.proxy){
            let proxyAgent = new HttpsProxyAgent(this.generalSettings.proxy);
            proxyAgent.options.rejectUnauthorized = !this.generalSettings.allowAllUnauthorizedSSL;
            fetch = (url, options) => plain_fetch(url, {...options, agent: proxyAgent});
            fetch.Headers = plain_fetch.Headers;
        }

        const client = new SimpleClient({endpointUrl, fetch});
        return new Promise<number>((resolve, reject) => client.query.select(this.getSettings().query).then(result => {
            let hadError = result.status >= 400;

            result.body.on('data', data => {
                log.debug("Receive Data from "+endpointUrl)
                response += data.toString();
            });

            result.body.on('error', err => {
                hadError = true;
                this.getSummary().appErrors.push(err.toString());
                log.error(err);
            })

            result.body.on('finish', () => {
                log.debug("Finished SPARQL Communication.")
                if(!hadError) {
                    try {
                        let json = JSON.parse(response);
                        let harvestTime = new Date(Date.now());
                        this.extractRecords(json, harvestTime).then(() =>
                            resolve(this.numIndexDocs));
                    } catch (e) {
                        this.getSummary().appErrors.push(e.toString());
                        log.error(e);
                        reject(e);
                    }
                }
            });
            result.body.on('end', () => {
                if(hadError) {
                    let message = result.statusText + ' - '+response;
                    this.getSummary().appErrors.push(message);
                    log.error(message);
                    reject();
                }
            });
        }));
    }

    async extractRecords(getRecordsResponse, harvestTime) {
        let promises = [];

        let records =  getRecordsResponse.results.bindings;


        let ids = [];
        for (let i = 0; i < records.length; i++) {
            ids.push(records[i].id.value);
        }

        for (let i = 0; i < records.length; i++) {
            this.getSummary().numDocs++;

            const uuid = records[i].id.value;
            if (!this.filterUtils.isIdAllowed(uuid)) {
                this.getSummary().skippedDocs.push(uuid);
                continue;
            }

            if (log.isDebugEnabled()) {
                log.debug(`Import document ${i + 1} from ${records.length}`);
            }
            if (logRequest.isDebugEnabled()) {
                logRequest.debug("Record content: ", records[i].toString());
            }

            let mapper = this.getMapper(this.getSettings(), records[i], harvestTime, this.getSummary());

            let doc: IndexDocument;
            try{
                doc = await ProfileFactoryLoader.get().getIndexDocumentFactory(mapper).create();
            }
            catch (e) {
                log.error('Error creating index document', e);
                this.getSummary().appErrors.push(e.toString());
                mapper.skipped = true;
            }

            if (!this.getSettings().dryRun && !mapper.shouldBeSkipped()) {
                let entity: RecordEntity = {
                    identifier: uuid,
                    source: this.getSettings().sourceURL,
                    collection_id: (await this.database.getCatalog(this.getSettings().catalogId)).id,
                    dataset: doc,
                    original_document: mapper.getHarvestedData()
                };
                promises.push(
                    this.database.addEntityToBulk(entity)
                        .then(response => {
                            if (!response.queued) {
                                // numIndexDocs += ElasticsearchUtils.maxBulkSize;
                                // this.observer.next(ImportResult.running(numIndexDocs, records.length));
                            }
                        })
                );
            } else {
                this.getSummary().skippedDocs.push(uuid);
            }
            this.observer.next(ImportResult.running(++this.numIndexDocs, this.totalRecords));
        }
        await Promise.all(promises)
            .catch(err => log.error('Error indexing DCAT record', err));
    }

    getMapper(settings, record, harvestTime, summary): SparqlMapper {
        return new SparqlMapper(settings, record, harvestTime, summary);
    }
}
