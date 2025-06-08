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
import { ConfigService } from '../../services/config/ConfigService';
import { DefaultImporterSettings } from '../../importer.settings';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Importer } from '../importer';
import { ImportLogMessage, ImportResult } from '../../model/import.result';
import { IndexDocument } from '../../model/index.document';
import { Observer } from 'rxjs';
import { ProfileFactory } from '../../profiles/profile.factory';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader';
import { RecordEntity } from '../../model/entity';
import { RequestDelegate } from '../../utils/http-request.utils';
import { SparqlMapper } from './sparql.mapper';
import { SparqlSettings } from './sparql.settings';
import { Summary } from '../../model/summary';

const log = require('log4js').getLogger(__filename);
const logRequest = getLogger('requests');
const plain_fetch = require('node-fetch');
const SimpleClient = require('sparql-http-client/SimpleClient');

export class SparqlImporter extends Importer {

    protected profile: ProfileFactory<SparqlMapper>;
    declare protected settings: SparqlSettings;

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

    constructor(settings, requestDelegate?: RequestDelegate) {
        super(settings);

        this.profile = ProfileFactoryLoader.get();

        // merge default settings with configured ones
        settings = MiscUtils.merge(SparqlImporter.defaultSettings, settings);

        this.settings = settings;
    }

    // only here for documentation - use the "default" exec function
    async exec(observer: Observer<ImportLogMessage>): Promise<void> {
        await super.exec(observer);
    }

    protected async harvest(): Promise<number> {
        log.debug('Requesting records');

        let response = "";

        const endpointUrl = this.settings.sourceURL;

        let fetch = plain_fetch;

        if(this.generalSettings.proxy){
            let proxyAgent = new HttpsProxyAgent(this.generalSettings.proxy);
            proxyAgent.options.rejectUnauthorized = !this.generalSettings.allowAllUnauthorizedSSL;
            fetch = function(url, options){
                return plain_fetch(url, {...options, agent: proxyAgent})
            }
            fetch.Headers = plain_fetch.Headers;
        }

        const client = new SimpleClient({endpointUrl, fetch});
        return new Promise<number>((resolve, reject) => client.query.select(this.settings.query).then(result => {
            let hadError = result.status >= 400;

            result.body.on('data', data => {
                log.debug("Receive Data from "+endpointUrl)
                response += data.toString();
            });

            result.body.on('error', err => {
                hadError = true;
                this.summary.appErrors.push(err.toString());
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
                        this.summary.appErrors.push(e.toString());
                        log.error(e);
                        reject(e);
                    }
                }
            });
            result.body.on('end', () => {
                if(hadError) {
                    let message = result.statusText + ' - '+response;
                    this.summary.appErrors.push(message);
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
            this.summary.numDocs++;

            const uuid = records[i].id.value;
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

            let doc: IndexDocument;
            try{
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
                this.summary.skippedDocs.push(uuid);
            }
            this.observer.next(ImportResult.running(++this.numIndexDocs, this.totalRecords));
        }
        await Promise.all(promises)
            .catch(err => log.error('Error indexing DCAT record', err));
    }

    getMapper(settings, record, harvestTime, summary): SparqlMapper {
        return new SparqlMapper(settings, record, harvestTime, summary);
    }


    getSummary(): Summary {
        return this.summary;
    }

}
