import {DefaultElasticsearchSettings, ElasticSearchUtils} from '../../utils/elastic.utils';
import {elasticsearchSettings} from '../../elastic.settings';
import {elasticsearchMapping} from '../../elastic.mapping';
import {IndexDocument} from '../../model/index.document';
import {Summary} from '../../model/summary';
import {DefaultImporterSettings, Importer} from '../../importer';
import {RequestDelegate} from '../../utils/http-request.utils';
import {CkanMapper} from './ckan.mapper';
import {Observable, Observer} from 'rxjs';
import {ImportLogMessage, ImportResult} from '../../model/import.result';
import {CkanSettings} from './ckan.settings';

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

    run: Observable<ImportLogMessage> = new Observable<ImportLogMessage>(observer => {
        this.observer = observer;
        this.exec(observer);
    });

    private observer: Observer<ImportLogMessage>;

    private numIndexDocs = 0;
    private requestDelegateCount: RequestDelegate;

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
        this.elastic = new ElasticSearchUtils(settings, this.summary);

        let requestConfig = CkanMapper.createRequestConfig(settings);
        let requestConfigCount = CkanMapper.createRequestConfigCount(settings);

        this.requestDelegate = new RequestDelegate(requestConfig, CkanMapper.createPaging(settings));
        this.requestDelegateCount = new RequestDelegate(requestConfigCount, CkanMapper.createPaging(settings));
    }

    /**
     * Requests a dataset with the given ID and imports it to Elasticsearch.
     *
     * @param args { issuedExisting, harvestTime }
     * @returns {Promise<*|Promise>}
     */
    async importDataset(args) {
        let source = args.data;
        let issuedExisting = args.issued;
        let totalCount = args.totalCount;

        let harvestTime = args.harvestTime;
        try {
            log.debug("Processing CKAN dataset: " + source.name + " from data-source: " + this.settings.ckanBaseUrl);


            // Execute the mappers
            let mapper = new CkanMapper(this.settings, {
                harvestTime: harvestTime,
                issuedDate: issuedExisting,
                currentIndexName: this.elastic.indexName,
                source: source,
                summary: this.summary
            });

            let doc = await IndexDocument.create(mapper)
                .catch(e => {
                    log.error('Error creating index document', e);
                    this.summary.appErrors.push(e.toString());
                    mapper.skipped = true;
                });

            this.summary.numDocs++;
            const currentDocPostion = this.summary.numDocs;
            this.observer.next(ImportResult.running(currentDocPostion, totalCount));

            if (mapper.shouldBeSkipped()) {
                this.summary.skippedDocs.push(source.id);
                return;
            }

            if (!this.settings.dryRun) {
                return this.elastic.addDocToBulk(doc, source.id)
                    .then(response => {
                        if (!response.queued) {
                            //let currentPos = this.summary.numDocs++;
                            this.numIndexDocs += ElasticSearchUtils.maxBulkSize;
                        }
                    })
            }
        } catch (e) {
            log.error("Error: " + e);
        }
    }

    async exec(observer: Observer<ImportLogMessage>): Promise<void> {
        try {
            if (this.settings.dryRun) {
                log.debug('Dry run option enabled. Skipping index creation.');
            } else {
                await this.elastic.prepareIndex(elasticsearchMapping, elasticsearchSettings);
            }
            let promises = [];
            let total = 0;
            let offset = this.settings.startPosition;

            // get total number of documents
            let countJson = await this.requestDelegateCount.doRequest();
            const totalCount = countJson.result.length;

            // Fetch datasets 'qs.rows' at a time
            while (true) {
                let json = await this.requestDelegate.doRequest();
                let now = new Date(Date.now());
                let results = this.settings.requestType === 'ListWithResources' ? json.result : json.result.results;

                // if offset is too high, then there should be an error and we are finished
                if (!results) break;

                // Workaround if results are contained with another array (https://offenedaten-koeln.de)
                if (results.length === 1 && results[0] instanceof Array) {
                    results = results[0];
                }

                log.info(`Received ${results.length} records from ${this.settings.ckanBaseUrl}`);
                total += results.length;

                let filteredResults = this.filterDatasets(results);

                // add skipped documents to count
                this.updateFetchedDatasets(results, filteredResults);

                let ids = filteredResults.map(result => result.id);

                // issued dates are those showing the date of the first harvesting
                let timestamps = await this.elastic.getIssuedDates(ids);

                filteredResults.forEach((dataset, idx) => promises.push(
                        this.importDataset({
                            data: dataset,
                            issued: timestamps[idx],
                            harvestTime: now,
                            totalCount
                        })
                    ));

                if (results.length < this.settings.maxRecords) {
                    break;
                } else {
                    offset += this.settings.maxRecords;
                    this.updateRequestMethod(offset);
                }
            }

            if (total === 0) {
                let warnMessage = `Could not harvest any datasets from ${this.settings.ckanBaseUrl}`;
                log.warn(warnMessage);
                this.sendFinishMessage(observer, warnMessage);

                await this.elastic.deleteIndex(this.elastic.indexName);
            } else {
                return Promise.all(promises)
                    .then(() => this.postIndexActions())
                    .then(() => this.sendFinishMessage(observer))
                    .catch(err => log.error('Error indexing data', err));
            }
        } catch (err) {
            log.error('error:', err);
            this.summary.appErrors.push(err.message);
            this.sendFinishMessage(observer, err.message);

            // clean up index
            await this.elastic.deleteIndex(this.elastic.indexName)
                .catch(e => log.error(e.message));
        }
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

    private updateFetchedDatasets(results, filteredResults) {
        const filteredLength = results.length - filteredResults.length;
        if (filteredLength > 0) {
            this.summary.numDocs += filteredLength;
        }
    }

    private filterDatasets(results) {
        return results
            .filter(dataset => this.hasValidTagsOrGroups(dataset, 'tags', this.settings.filterTags))
            .filter(dataset => this.hasValidTagsOrGroups(dataset, 'groups', this.settings.filterGroups))
            .filter(dataset => this.isIdAllowed(dataset.id));
    }

    private updateRequestMethod(offset: number) {
        this.requestDelegate.updateConfig({
            qs: {
                offset: offset,
                limit: this.settings.maxRecords
            }
        });
    }

    /**
     * Check if a dataset has at least one of the defined tags/groups. If no tag/group has been
     * defined, then the dataset also will be used.
     *
     * @param dataset is the dataset to be checked
     * @param field defines if we want to check for tags or groups
     * @param filteredItems are the tags/groups to be checked against the dataset
     */
    private hasValidTagsOrGroups(dataset: any, field: 'tags' | 'groups', filteredItems: string[]) {
        if (filteredItems.length === 0 || (!dataset[field] && filteredItems.length === 0)) return true;

        let hasAtLeastOneGroup = dataset[field] && dataset[field].some(field => filteredItems.includes(field.name));
        if (!hasAtLeastOneGroup) {
            this.summary.skippedDocs.push(dataset.id);
            // log.debug(`Skip dataset because of filtered tag`);
        }
        return hasAtLeastOneGroup;
    }

    getSummary(): Summary {
        return this.summary;
    }

    private isIdAllowed(id: string) {
        if (this.settings.blacklistedIds) {
            const isValid = this.settings.blacklistedIds.indexOf(id) === -1;
            if (!isValid) {
                this.summary.skippedDocs.push(id);
            }

            return isValid;
        }
        return true;
    }
}
