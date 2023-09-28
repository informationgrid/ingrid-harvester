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

import { CkanMapper, CkanMapperData } from './ckan.mapper';
import { CkanSettings, defaultCKANSettings } from './ckan.settings';
import { ElasticsearchUtils } from '../../persistence/elastic.utils';
import { Entity } from '../../model/entity';
import { Importer } from '../importer';
import { ImportLogMessage, ImportResult } from '../../model/import.result';
import { MiscUtils } from '../../utils/misc.utils';
import { Observer } from 'rxjs';
import { ProfileFactory } from "../../profiles/profile.factory";
import { ProfileFactoryLoader } from "../../profiles/profile.factory.loader";
import { RequestDelegate } from '../../utils/http-request.utils';
import { Summary } from '../../model/summary';

let log = require('log4js').getLogger(__filename);

export class CkanImporter extends Importer {
    private profile: ProfileFactory<CkanMapper>;
    protected readonly settings: CkanSettings;

    private requestDelegate: RequestDelegate;

    protected numIndexDocs = 0;
    private requestDelegateCount: RequestDelegate;
    private totalCount: number = -1;

    /**
     * Create the importer and initialize with settings.
     * @param { {ckanBaseUrl, defaultMcloudSubgroup, mapper} }settings
     */
    constructor(settings) {
        super(settings);

        this.profile = ProfileFactoryLoader.get();

        // merge default settings with configured ones
        settings = MiscUtils.merge(defaultCKANSettings, settings);

        // Trim trailing slash
        let url = settings.ckanBaseUrl;
        if (url.charAt(url.length - 1) === '/') {
            settings.ckanBaseUrl = url.substring(0, url.length - 1);
        }
        this.settings = settings;

        let requestConfig = CkanMapper.createRequestConfig(settings);
        let requestConfigCount = CkanMapper.createRequestConfigCount(settings);

        this.requestDelegate = new RequestDelegate(requestConfig, CkanMapper.createPaging(settings));
        this.requestDelegateCount = new RequestDelegate(requestConfigCount, CkanMapper.createPaging(settings));
    }

    /**
     * Requests a dataset with the given ID and imports it to Elasticsearch.
     *
     * @returns {Promise<*|Promise>}
     * @param data
     */
    async importDataset(data: CkanMapperData) {

        try {
            log.debug('Processing CKAN dataset: ' + data.source.name + ' from data-source: ' + this.settings.ckanBaseUrl);

            // Execute the mappers
            let mapper = new CkanMapper(this.settings, data);

            let doc: any = await this.profile.getIndexDocument().create(mapper)
                .catch(e => {
                    log.error('Error creating index document', e);
                    this.summary.appErrors.push(e.toString());
                    mapper.skipped = true;
                });

            this.posthandlingDocument(mapper, doc);

            if (mapper.shouldBeSkipped()) {
                this.summary.skippedDocs.push(data.source.id);
                return;
            }

            return this.indexDocument(doc, mapper.getHarvestedData(), data.source.id);

        } catch (e) {
            log.error('Error: ' + e);
        }
    }

    protected posthandlingDocument(mapper: CkanMapper, doc: any){
        // For Profile specific Handling
    }

    private indexDocument(doc, harvestedData, sourceID) {
        if (!this.settings.dryRun) {
            let entity: Entity = {
                identifier: sourceID,
                source: this.settings.ckanBaseUrl,
                collection_id: this.database.defaultCatalog.id,
                dataset: doc,
                original_document: harvestedData
            };
            return this.database.addEntityToBulk(entity)
                .then(response => {
                    if (!response.queued) {
                        this.numIndexDocs += ElasticsearchUtils.maxBulkSize;
                    }
                });
        }
    }

    async exec(observer: Observer<ImportLogMessage>): Promise<void> {
        let promises = [];

        try {
            // await this.prepareIndex();

            // get total number of documents
            let countJson = await this.requestDelegateCount.doRequest();
            this.totalCount = countJson.result.length;

            const total = await this.fetchFilterAndIndexDocuments(promises);

            if (total === 0) {
                let warnMessage = `Could not harvest any datasets from ${this.settings.ckanBaseUrl}`;
                await this.handleImportError(warnMessage, observer);
            } else {
                // return this.finishImport(promises, observer);
            }

        } catch (err) {
            await this.handleImportError(err.message, observer);
        }
    }

    private async handleImportError(message, observer: Observer<ImportLogMessage>) {
        log.error('error:', message);
        this.summary.appErrors.push(message);
        this.sendFinishMessage(observer, message);

        // clean up index
        // await this.elastic.deleteIndex(this.elastic.indexName)
        //     .catch(e => log.error(e.message));
    }

    private finishImport(promises: any[], observer: Observer<ImportLogMessage>) {
        return Promise.all(promises)
            .then(() => this.postIndexActions())
            .then(() => this.sendFinishMessage(observer))
            .catch(err => log.error('Error indexing data', err));
    }

    private async prepareIndex() {
        if (this.settings.dryRun) {
            log.debug('Dry run option enabled. Skipping index creation.');
        } else {
            await this.elastic.prepareIndex(this.profile.getIndexMappings(), this.profile.getIndexSettings());
        }
    }

    private async fetchFilterAndIndexDocuments(promises: any[]) {
        let total = 0;
        let offset = this.settings.startPosition;

        while (true) {
            let now = new Date();
            let results = await this.requestDocuments();

            // if offset is too high, then there should be an error and we are finished
            if (!results) {
                break;
            }

            log.info(`Received ${results.length} records from ${this.settings.ckanBaseUrl}`);
            total += results.length;

            let filteredResults = this.filterDatasets(results);

            // add skipped documents to count
            this.summary.numDocs += results.length - filteredResults.length;

            for (let i = 0; i < filteredResults.length; i++) {
                promises.push(
                    await this.importDataset({
                        source: filteredResults[i],
                        harvestTime: now,
                        currentIndexName: this.elastic.indexName,
                        summary: this.summary
                    }).then(() => this.observer.next(ImportResult.running(++this.summary.numDocs, this.totalCount)))
                );
            }

            const isLastPage = results.length < this.settings.maxRecords;
            if (isLastPage) {
                break;
            }

            offset += this.settings.maxRecords;
            this.updateRequestMethod(offset);

        }
        await this.postHarvestingHandling(promises)
        return total;
    }

    protected async postHarvestingHandling(promises: any[]){
        // For Profile specific Handling
    }

    private async requestDocuments() {
        let json = await this.requestDelegate.doRequest();
        let results = this.settings.requestType === 'ListWithResources' ? json.result : json.result.results;

        if (json.result.count) {
            this.totalCount = json.result.count;
        }
        // Workaround if results are contained with another array (https://offenedaten-koeln.de)
        if (results && results.length === 1 && results[0] instanceof Array) {
            results = results[0];
        }

        return results;
    }

    private postIndexActions() {
        // if (this.settings.dryRun) {
        //     log.debug('Skipping finalisation of index for dry run.');
        // }
        // else {
        //     return this.elastic.finishIndex();
        // }
    }

    private sendFinishMessage(observer: Observer<ImportLogMessage>, message?: string) {
        observer.next(ImportResult.complete(this.summary, message));
        observer.complete();
    }

    private filterDatasets(results) {
        const filteredResult: any[] = results
            .filter(dataset => this.filterUtils.hasValidTagsOrGroups(dataset, 'tags', this.settings.filterTags))
            .filter(dataset => this.filterUtils.hasValidTagsOrGroups(dataset, 'groups', this.settings.filterGroups))
            .filter(dataset => this.filterUtils.isIdAllowed(dataset.id));

        const skippedIDs = results
            .filter(item => !filteredResult.some(filtered => filtered.id === item.id))
            .map(item => item.id);

        this.markSkipped(skippedIDs);

        return filteredResult;
    }

    markSkipped(skippedIDs: any[]) {
        skippedIDs.forEach(id => this.summary.skippedDocs.push(id));
    }

    private updateRequestMethod(offset: number) {
        if (this.settings.requestType === 'ListWithResources') {
            this.requestDelegate.updateConfig({
                qs: {
                    offset: offset,
                    limit: this.settings.maxRecords
                }
            });
        } else {
            let partialConfig = {
                qs: {
                    sort: 'id asc',
                    start: offset,
                    rows: this.settings.maxRecords
                }
            };
            if (this.settings.filterGroups.length > 0 || this.settings.filterTags.length > 0 || this.settings.additionalSearchFilter) {
                let fq = '';
                if (this.settings.filterGroups.length > 0) {
                    fq += '+groups:(' + this.settings.filterGroups.join(' OR ') + ')';
                }
                if (this.settings.filterTags.length > 0) {
                    fq += '+tags:(' + this.settings.filterTags.join(' OR ') + ')';
                }
                if (this.settings.additionalSearchFilter) {
                    fq += '+' + this.settings.additionalSearchFilter;
                }
                if (this.settings.whitelistedIds.length > 0) {
                    fq = '((' + fq + ') OR id:(' + this.settings.whitelistedIds.join(' OR ') + '))';
                }
                partialConfig['fq'] = fq;
            }
            this.requestDelegate.updateConfig(partialConfig);
        }
    }

    getSummary(): Summary {
        return this.summary;
    }
}
