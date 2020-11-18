import {DefaultElasticsearchSettings, ElasticSearchUtils} from '../../utils/elastic.utils';
import {elasticsearchSettings} from '../../elastic.settings';
import {elasticsearchMapping} from '../../elastic.mapping';
import {IndexDocument} from '../../model/index.document';
import {Summary} from '../../model/summary';
import {DefaultImporterSettings, Importer} from '../../importer';
import {RequestDelegate} from '../../utils/http-request.utils';
import {CkanMapper, CkanMapperData} from './ckan.mapper';
import {Observable, Observer} from 'rxjs';
import {ImportLogMessage, ImportResult} from '../../model/import.result';
import {CkanSettings} from './ckan.settings';
import {FilterUtils} from "../../utils/filter.utils";

let log = require('log4js').getLogger(__filename);

export class CkanImporter implements Importer {
    private readonly settings: CkanSettings;
    elastic: ElasticSearchUtils;
    private requestDelegate: RequestDelegate;

    static defaultSettings: CkanSettings = {
        ...DefaultElasticsearchSettings,
        ...DefaultImporterSettings,
        ckanBaseUrl: '',
        filterTags: [],
        filterGroups: [],
        providerPrefix: '',
        providerField: 'organization',
        dateSourceFormats: [],
        requestType: 'ListWithResources',
        markdownAsDescription: true,
        defaultLicense: null
    };

    summary: Summary;
    private filterUtils: FilterUtils;

    run: Observable<ImportLogMessage> = new Observable<ImportLogMessage>(observer => {
        this.observer = observer;
        this.exec(observer);
    });

    private observer: Observer<ImportLogMessage>;

    private numIndexDocs = 0;
    private requestDelegateCount: RequestDelegate;
    private totalCount: number = -1;

    /**
     * Create the importer and initialize with settings.
     * @param { {ckanBaseUrl, defaultMcloudSubgroup, mapper} }settings
     */
    constructor(settings: CkanSettings) {
        // merge default settings with configured ones
        settings = {...CkanImporter.defaultSettings, ...settings};

        this.summary = new Summary(settings);

        // Trim trailing slash
        let url = settings.ckanBaseUrl;
        if (url.charAt(url.length - 1) === '/') {
            settings.ckanBaseUrl = url.substring(0, url.length - 1);
        }
        this.settings = settings;
        this.filterUtils = new FilterUtils(settings);
        this.elastic = new ElasticSearchUtils(settings, this.summary);

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
            log.debug("Processing CKAN dataset: " + data.source.name + " from data-source: " + this.settings.ckanBaseUrl);

            // Execute the mappers
            let mapper = new CkanMapper(this.settings, data);

            let doc = await IndexDocument.create(mapper)
                .catch(e => {
                    log.error('Error creating index document', e);
                    this.summary.appErrors.push(e.toString());
                    mapper.skipped = true;
                });

            if (mapper.shouldBeSkipped()) {
                this.summary.skippedDocs.push(data.source.id);
                return;
            }

            return this.indexDocument(doc, data.source.id);

        } catch (e) {
            log.error("Error: " + e);
        }
    }

    private indexDocument(doc, sourceID) {
        if (!this.settings.dryRun) {
            return this.elastic.addDocToBulk(doc, sourceID)
                .then(response => {
                    if (!response.queued) {
                        this.numIndexDocs += ElasticSearchUtils.maxBulkSize;
                    }
                })
        }
    }

    async exec(observer: Observer<ImportLogMessage>): Promise<void> {
        let promises = [];

        try {
            await this.prepareIndex();

            // get total number of documents
            let countJson = await this.requestDelegateCount.doRequest();
            this.totalCount = countJson.result.length;

            const total = await this.fetchFilterAndIndexDocuments(promises);

            if (total === 0) {
                let warnMessage = `Could not harvest any datasets from ${this.settings.ckanBaseUrl}`;
                await this.handleImportError(warnMessage, observer);
            } else {
                return this.finishImport(promises, observer);
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
        await this.elastic.deleteIndex(this.elastic.indexName)
            .catch(e => log.error(e.message));
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
            await this.elastic.prepareIndex(elasticsearchMapping, elasticsearchSettings);
        }
    }

    private async fetchFilterAndIndexDocuments(promises: any[]) {
        let total = 0;
        let offset = this.settings.startPosition;

        while (true) {
            let now = new Date();
            let results = await this.requestDocuments();

            // if offset is too high, then there should be an error and we are finished
            if (!results) break;

            log.info(`Received ${results.length} records from ${this.settings.ckanBaseUrl}`);
            total += results.length;

            let filteredResults = this.filterDatasets(results);

            // add skipped documents to count
            this.summary.numDocs += results.length - filteredResults.length;

            let storedData = await this.getStoredData(filteredResults);

            for (let i=0; i<filteredResults.length; i++) {
                promises.push(
                    this.importDataset({
                        source: filteredResults[i],
                        storedData: storedData[i],
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
        return total;
    }

    private async getStoredData(filteredResults: any[]) {
        let ids = filteredResults.map(result => result.id);

        // issued dates are those showing the date of the first harvesting
        return await this.elastic.getStoredData(ids);
    }

    private async requestDocuments() {
        let json = await this.requestDelegate.doRequest();
        let results = this.settings.requestType === 'ListWithResources' ? json.result : json.result.results;

        if(json.result.count) {
            this.totalCount = json.result.count;
        }
        // Workaround if results are contained with another array (https://offenedaten-koeln.de)
        if (results && results.length === 1 && results[0] instanceof Array) {
            results = results[0];
        }

        return results;
    }

    private postIndexActions() {
        if (this.settings.dryRun) {
            log.debug('Skipping finalisation of index for dry run.');
        } else {
            return this.elastic.finishIndex();
        }
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
            let fq;
            if(this.settings.filterGroups.length > 0 || this.settings.filterTags.length > 0 || this.settings.additionalSearchFilter)
            {
                fq = '';
                if(this.settings.filterGroups.length > 0) {
                    fq += '+groups:(' + this.settings.filterGroups.join(' OR ') + ')';
                }
                if(this.settings.filterTags.length > 0) {
                    fq += '+tags:(' + this.settings.filterTags.join(' OR ') + ')';
                }
                if(this.settings.additionalSearchFilter){
                    fq += '+'+this.settings.additionalSearchFilter;
                }
                if(this.settings.whitelistedIds.length > 0){
                    fq = '(('+fq+ ') OR id:('+this.settings.whitelistedIds.join(' OR ')+'))'
                }
            }
            this.requestDelegate.updateConfig({
                qs: {
                    sort: 'id asc',
                    start: offset,
                    rows: this.settings.maxRecords,
                    fq: fq
                }
            });
        }
    }

    getSummary(): Summary {
        return this.summary;
    }

}
