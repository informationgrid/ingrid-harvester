import {ElasticSearchUtils, ElasticSettings} from "../utils/elastic.utils";
import {elasticsearchSettings} from "../elastic.settings";
import {elasticsearchMapping} from "../elastic.mapping";
import {CkanMapper} from "./ckan.mapper";
import {IndexDocument} from "../model/index.document";
import {Summary} from "../model/summary";
import {getLogger} from "log4js";
import {Importer, ImporterSettings} from "../importer";
import {RequestDelegate} from "../utils/http-request.utils";

let log = require( 'log4js' ).getLogger( __filename ),
    logSummary = getLogger('summary');

export type CkanSettings = {
    description?, ckanBaseUrl,
    defaultMcloudSubgroup, defaultDCATCategory, maxRecords?: number, startPosition?: number
} & ElasticSettings & ImporterSettings;

export class CkanImporter implements Importer {
    private readonly settings: CkanSettings;
    elastic: ElasticSearchUtils;
    private requestDelegate: RequestDelegate;
    summary: Summary = {
        appErrors: [],
        numDocs: 0,
        numErrors: 0,
        print: () => {
            logSummary.info(`---------------------------------------------------------`);
            logSummary.info(`Summary of: ${this.settings.type}`);
            logSummary.info(`---------------------------------------------------------`);
            logSummary.info(`Number of records: ${this.summary.numDocs}`);
            logSummary.info(`Number of errors: ${this.summary.numErrors}`);
            logSummary.info(`App-Errors: ${this.summary.appErrors.length}`);
            if (this.summary.appErrors.length > 0) {
                logSummary.info(`\t${this.summary.appErrors.map( e => e + '\n\t')}`);
            }
        }
    };

    /**
     * Create the importer and initialize with settings.
     * @param { {ckanBaseUrl, defaultMcloudSubgroup, mapper} }settings
     */
    constructor(settings: CkanSettings) {
        // Trim trailing slash
        let url = settings.ckanBaseUrl;
        if (url.charAt(url.length-1) === '/') {
            settings.ckanBaseUrl = url.substring(0, url.length-1);
        }
        this.settings = settings;
        this.elastic = new ElasticSearchUtils(settings);

        let requestConfig = CkanMapper.createRequestConfig(settings);

        this.requestDelegate = new RequestDelegate(requestConfig, CkanMapper.createPaging(settings));
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
        let harvestTime = args.harvestTime;
        try {
            log.debug("Processing CKAN dataset: " + source.name + " from data-source: " + this.settings.ckanBaseUrl);

            this.summary.numDocs++;

            // Execute the mappers
            let mapper = new CkanMapper(this.settings, {
                harvestTime: harvestTime,
                issuedDate: issuedExisting,
                currentIndexName: this.elastic.indexName,
                source: source
            });

            let doc = await IndexDocument.create(mapper).catch( e => {
                log.error('Error creating index document', e);
                this.summary.appErrors.push(e.toString());
                mapper.skipped = true;
            });

            if (!this.settings.dryRun && !mapper.shouldBeSkipped()) {
                return this.elastic.addDocToBulk(doc, source.id);
            }
        } catch (e) {
            log.error("Error: " + e);
        }
    }

    async run(): Promise<Summary> {
        try {
            if (this.settings.dryRun) {
                log.debug('Dry run option enabled. Skipping index creation.');
            } else {
                await this.elastic.prepareIndex(elasticsearchMapping, elasticsearchSettings);
            }
            let promises = [];
            let total = 0;

            // Fetch datasets 'qs.rows' at a time
            while(true) {
                let json = await this.requestDelegate.doRequest();
                let now = new Date(Date.now());
                let results = json.result.results;

                log.info(`Received ${results.length} records from ${this.settings.ckanBaseUrl}`);
                total += results.length;

                let ids = results.map(result => result.id);

                // issued dates are those showing the date of the first harvesting
                let timestamps = await this.elastic.getIssuedDates(ids);

                results.forEach((dataset, idx) => promises.push(this.importDataset({
                    data: dataset,
                    issued: timestamps[idx],
                    harvestTime: now
                })));

                if (results.length < 1) {
                    break;
                } else {
                    this.requestDelegate.incrementStartRecordIndex();
                }
            }

            if (total === 0) {
                log.warn(`Could not harvest any datasets from ${this.settings.ckanBaseUrl}`);
                await this.elastic.abortCurrentIndex();
                return this.summary;
            } else {
                return Promise.all(promises)
                    .then(() => {
                        if (this.settings.dryRun) {
                            log.debug('Skipping finalisation of index for dry run.');
                        } else {
                            return this.elastic.finishIndex();
                        }
                    })
                    .then( () => this.summary)
                    .catch(err => log.error('Error indexing data', err));
            }
        } catch (err) {
            log.error( 'error:', err );
        }
    }
}
