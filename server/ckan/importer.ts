import {ElasticSearchUtils} from "../utils/elastic-utils";
import {UrlUtils} from "../utils/url-utils";
import {Utils} from "../utils/common-utils";
import {elasticsearchSettings} from "../elastic.settings";
import {elasticsearchMapping} from "../elastic.mapping";
import {CkanToElasticsearchMapper} from "./ckan.mapper";
import {IndexDocument} from "../model/index-document";

let request = require( 'request-promise' ),
    log = require( 'log4js' ).getLogger( __filename ),
    markdown = require('markdown').markdown;

export class DeutscheBahnCkanImporter {
    private settings: any;
    elastic: ElasticSearchUtils;
    private options_package_search;

    /**
     * Create the importer and initialize with settings.
     * @param { {ckanBaseUrl, defaultMcloudSubgroup, mapper} }settings
     */
    constructor(settings) {
        // Trim trailing slash
        let url = settings.ckanBaseUrl;
        if (url.charAt(url.length-1) === '/') {
            settings.ckanBaseUrl = url.substring(0, url.length-1);
        }
        this.settings = settings;
        this.elastic = new ElasticSearchUtils(settings);

        this.options_package_search = {
            uri: settings.ckanBaseUrl + "/api/3/action/package_search", // See http://docs.ckan.org/en/ckan-2.7.3/api/
            qs: {
                sort: "id asc",
                start: 0,
                rows: 100
            },
            headers: {'User-Agent': 'mCLOUD Harvester. Request-Promise'},
            json: true
        };
        if (settings.proxy) {
            this.options_package_search.proxy = settings.proxy;
        }
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

            // Execute the mappers
            this.settings.currentIndexName = this.elastic.indexName;
            this.settings.harvestTime = harvestTime;
            this.settings.issuedDate = issuedExisting;
            let mapper = new CkanToElasticsearchMapper(this.settings, source);
            let doc = await IndexDocument.create(mapper);

            if (!this.settings.dryRun) {
                return this.elastic.addDocToBulk(doc, source.id);
            }
        } catch (e) {
            log.error("Error: " + e);
        }
    }

    async run() {
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
                let json = await request.get(this.options_package_search);
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
                    this.options_package_search.qs.start += this.options_package_search.qs.rows;
                }
            }

            if (total === 0) {
                log.warn(`Could not harvest any datasets from ${this.settings.ckanBaseUrl}`);
                await this.elastic.abortCurrentIndex();
            } else {
                Promise.all(promises)
                    .then(() => {
                        if (this.settings.dryRun) {
                            log.debug('Skipping finalisation of index for dry run.');
                        } else {
                            this.elastic.finishIndex();
                        }
                    })
                    .catch(err => log.error('Error indexing data', err));
            }
        } catch (err) {
            log.error( 'error:', err );
        }
    }
}
