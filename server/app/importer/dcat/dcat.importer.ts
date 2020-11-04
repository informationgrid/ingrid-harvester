import {DefaultElasticsearchSettings, ElasticSearchUtils} from '../../utils/elastic.utils';
import {elasticsearchMapping} from '../../elastic.mapping';
import {elasticsearchSettings} from '../../elastic.settings';
import {IndexDocument} from '../../model/index.document';
import {DcatMapper} from './dcat.mapper';
import {Summary} from '../../model/summary';
import {getLogger} from 'log4js';
import {OptionsWithUri} from 'request-promise';
import {DefaultImporterSettings, Importer} from '../../importer';
import {Observable, Observer} from 'rxjs';
import {ImportLogMessage, ImportResult} from '../../model/import.result';
import {DcatSettings} from './dcat.settings';
import {FilterUtils} from "../../utils/filter.utils";
import {RequestDelegate} from "../../utils/http-request.utils";

let log = require('log4js').getLogger(__filename),
    logSummary = getLogger('summary'),
    logRequest = getLogger('requests'),
    DomParser = require('xmldom').DOMParser;

export class DcatSummary extends Summary {
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

export class DcatImporter implements Importer {
    private readonly settings: DcatSettings;
    elastic: ElasticSearchUtils;
    private readonly requestDelegate: RequestDelegate;

    private totalRecords = 0;
    private numIndexDocs = 0;

    static defaultSettings: DcatSettings = {
        ...DefaultElasticsearchSettings,
        ...DefaultImporterSettings,
        catalogUrl: '',
        filterTags: [],
        filterThemes: []
    };

    private readonly summary: DcatSummary;
    private filterUtils: FilterUtils;

    run = new Observable<ImportLogMessage>(observer => {
        this.observer = observer;
        this.exec(observer);
    });

    private observer: Observer<ImportLogMessage>;

    constructor(settings, requestDelegate?: RequestDelegate) {
        // merge default settings with configured ones
        settings = {...DcatImporter.defaultSettings, ...settings};

        if (requestDelegate) {
            this.requestDelegate = requestDelegate;
        } else {
            let requestConfig = DcatImporter.createRequestConfig(settings);
            this.requestDelegate = new RequestDelegate(requestConfig, DcatImporter.createPaging(settings));
        }

        this.settings = settings;
        this.filterUtils = new FilterUtils(settings);

        this.summary = new DcatSummary(settings);

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
                log.error('Error during DCAT import', err);
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

            let responseDom = new DomParser().parseFromString(response);

            let isLastPage = false;

            let pagedCollection = responseDom.getElementsByTagNameNS(DcatMapper.HYDRA, 'PagedCollection')[0];
            if (pagedCollection) {
                let numReturned = responseDom.getElementsByTagNameNS(DcatMapper.DCAT, 'Dataset').length;
                let itemsPerPage = DcatMapper.select('./hydra:itemsPerPage', pagedCollection, true).textContent;
                this.totalRecords = DcatMapper.select('./hydra:totalItems', pagedCollection, true).textContent;

                let thisPageUrl = pagedCollection.getAttribute('rdf:about');

                let thisPage = Number(DcatImporter.getPageFromUrl(thisPageUrl));

                let lastPage = this.totalRecords/itemsPerPage;
                let lastPageUrlElement = DcatMapper.select('./hydra:lastPage', pagedCollection, true);
                if(lastPageUrlElement){
                    let lastPageUrl = lastPageUrlElement.textContent;
                    lastPage = Number(DcatImporter.getPageFromUrl(lastPageUrl));
                }


                isLastPage = thisPage >= lastPage;
                if(!isLastPage){
                    let nextPageUrl = DcatMapper.select('./hydra:nextPage', pagedCollection, true).textContent;
                    let nextPage = Number(DcatImporter.getPageFromUrl(nextPageUrl));
                    this.requestDelegate.updateConfig({qs: {page: nextPage}});
                }

                log.debug(`Received ${numReturned} records from ${this.settings.catalogUrl} - Page: ${thisPage}`);
                await this.extractRecords(response, harvestTime)
            } else {
                const message = `Error while fetching DCAT Records. Will continue to try and fetch next records, if any.\nServer response: ${responseDom.toString()}.`;
                log.error(message);
                this.summary.appErrors.push(message);
            }

            if (isLastPage) break;
        }

    }

    async extractRecords(getRecordsResponse, harvestTime) {
        let promises = [];
        let xml = new DomParser().parseFromString(getRecordsResponse, 'application/xml');
        let rootNode = xml.getElementsByTagNameNS(DcatMapper.RDF, 'RDF')[0];
        let records =  DcatMapper.select('./dcat:Catalog/dcat:dataset/dcat:Dataset|./dcat:Dataset', rootNode);


        let ids = [];
        for (let i = 0; i < records.length; i++) {
            ids.push(records[i].getAttribute('rdf:about'));
        }

        let now = new Date(Date.now());
        let issued;

        if (this.settings.dryRun) {
            issued = ids.map(() => now);
        } else {
            issued = await this.elastic.getIssuedDates(ids);
        }

        for (let i = 0; i < records.length; i++) {
            this.summary.numDocs++;

            const uuid = DcatMapper.select('./dct:identifier', records[i], true).textContent;
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

            let mapper = this.getMapper(this.settings, records[i], rootNode, harvestTime, issued[i], this.summary);

            let doc: any = await IndexDocument.create(mapper).catch(e => {
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
            .catch(err => log.error('Error indexing DCAT record', err));
    }

    getMapper(settings, record, catalogPage, harvestTime, issuedTime, summary): DcatMapper {
        return new DcatMapper(settings, record, catalogPage, harvestTime, issuedTime, summary);
    }

    static createRequestConfig(settings: DcatSettings): OptionsWithUri {
        let requestConfig: OptionsWithUri = {
            method: "GET",
            uri: settings.catalogUrl,
            json: false,
            proxy: settings.proxy || null
        };

        requestConfig.qs = {
            page: 1
        };

        return requestConfig;
    }

    static createPaging(settings: DcatSettings) {
        return {
            startFieldName: 'page',
            startPosition: settings.startPosition,
            numRecords: settings.maxRecords
        }
    }

    getSummary(): Summary {
        return this.summary;
    }

    private static getPageFromUrl(url: string) {
        let pos = url.indexOf('page=')
        if (pos !== -1) {
            url = url.substr(pos + 5);
            return url;
        }
        return undefined;
    }
}
