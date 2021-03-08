import {DefaultElasticsearchSettings, ElasticSearchUtils} from '../../utils/elastic.utils';
import {elasticsearchMapping} from '../../elastic.mapping';
import {elasticsearchSettings} from '../../elastic.settings';
import {IndexDocument} from '../../model/index.document';
import {SparqlMapper} from './sparql.mapper';
import {Summary} from '../../model/summary';
import {getLogger} from 'log4js';
import {DefaultImporterSettings, Importer} from '../../importer';
import {Observable, Observer} from 'rxjs';
import {ImportLogMessage, ImportResult} from '../../model/import.result';
import {SparqlSettings} from './sparql.settings';
import {FilterUtils} from "../../utils/filter.utils";
import {RequestDelegate} from "../../utils/http-request.utils";
import {ConfigService} from "../../services/config/ConfigService";


const plain_fetch = require('node-fetch');
const HttpsProxyAgent = require('https-proxy-agent');

let log = require('log4js').getLogger(__filename),
    logSummary = getLogger('summary'),
    logRequest = getLogger('requests'),
    SimpleClient = require('sparql-http-client/SimpleClient');

export class SparqlSummary extends Summary {
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

export class SparqlImporter implements Importer {
    private readonly settings: SparqlSettings;
    elastic: ElasticSearchUtils;
    private readonly requestDelegate: RequestDelegate;

    private totalRecords = 0;
    private numIndexDocs = 0;

    private generalSettings = ConfigService.getGeneralSettings();

    static defaultSettings: SparqlSettings = {
        ...DefaultElasticsearchSettings,
        ...DefaultImporterSettings,
        endpointUrl: '',
        query: '',
        filterTags: [],
        filterThemes: []
    };

    private readonly summary: SparqlSummary;
    private filterUtils: FilterUtils;

    run = new Observable<ImportLogMessage>(observer => {
        this.observer = observer;
        this.exec(observer);
    });

    private observer: Observer<ImportLogMessage>;

    constructor(settings, requestDelegate?: RequestDelegate) {
        // merge default settings with configured ones
        settings = {...SparqlImporter.defaultSettings, ...settings};

        this.settings = settings;
        this.filterUtils = new FilterUtils(settings);

        this.summary = new SparqlSummary(settings);

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
                log.error('Error during SPARQL import', err);
                observer.next(ImportResult.complete(this.summary, 'Error happened'));
                observer.complete();

                // clean up index
                this.elastic.deleteIndex(this.elastic.indexName);
            }
        }
    }

    async harvest() {
            log.debug('Requesting records');

            let response = "";

            const endpointUrl = this.settings.endpointUrl;

            let fetch = plain_fetch;

            if(this.generalSettings.proxy){
                let proxyAgent = new HttpsProxyAgent(this.generalSettings.proxy);
                fetch = function(url, options){
                    return plain_fetch(url, {...options, agent: proxyAgent})
                }
                fetch.Headers = plain_fetch.Headers;
            }

            const client = new SimpleClient({endpointUrl, fetch});
            await client.query.select(this.settings.query).then(result => {
                let hadError = result.status >= 400;

                result.body.on('data', data => {
                    response += data.toString();
                });

                result.body.on('error', err => {
                    hadError = true;
                    this.summary.appErrors.push(err.toString());
                    log.error(err)
                })

                result.body.on('finish', () => {
                    if(!hadError) {
                        try {
                            let json = JSON.parse(response);
                            let harvestTime = new Date(Date.now());
                            this.extractRecords(json, harvestTime)
                        } catch (e) {
                            this.summary.appErrors.push(e.toString());
                            log.error(e)
                        }
                    }
                });
                result.body.on('end', () => {
                    if(hadError) {
                        let message = result.statusText + ' - '+response;
                        this.summary.appErrors.push(message);
                        log.error(message);
                    }
                });
            });

    }

    async extractRecords(getRecordsResponse, harvestTime) {
        let promises = [];

        let records =  getRecordsResponse.results.bindings;


        let ids = [];
        for (let i = 0; i < records.length; i++) {
            ids.push(records[i].id.value);
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

            let mapper = this.getMapper(this.settings, records[i], harvestTime, storedData[i], this.summary);

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

    getMapper(settings, record, harvestTime, storedData, summary): SparqlMapper {
        return new SparqlMapper(settings, record, harvestTime, storedData, summary);
    }


    getSummary(): Summary {
        return this.summary;
    }

}
