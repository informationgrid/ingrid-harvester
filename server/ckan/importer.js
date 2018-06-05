'use strict';

let request = require( 'request-promise' ),
    async = require( 'async' ),
    log = require( 'log4js' ).getLogger( __filename ),
    ElasticSearchUtils = require( './../elastic-utils' ),
    settings = require('../elastic.settings.js'),
    mapping = require( '../elastic.mapping.js' );

class GovDataImporter {

    /**
     * Create the importer and initialize with settings.
     * @param { {urlSearch, urlData, mapper} }settings
     */
    constructor(settings) {
        this.settings = settings;
        this.elastic = new ElasticSearchUtils(settings);

        this.options_package_search = {
            uri: settings.ckanBaseUrl + "/api/3/action/package_search", // See http://docs.ckan.org/en/ckan-2.7.3/api/
            qs: {
                sort: "id asc",
                start: 0,
                rows: 100
            },
            headers: {'User-Agent': 'Request-Promise'},
            json: true
        };
    }

    /**
     * Requests a dataset with the given ID and imports it to Elasticsearch.
     * @param {string} id
     * @param {function} callback
     */
    async importDataset(source, callback) {
        try {
            log.debug("Processing dataset: " + source.name)

            let target = {};
            target.id = source.id;
            target.name = source.name;
            target.title = source.title;
            target.description = source.notes;
            target.theme = ['http://publications.europa.eu/resource/authority/data-theme/TRAN']; // see https://joinup.ec.europa.eu/release/dcat-ap-how-use-mdr-data-themes-vocabulary
            target.issued = source.metadata_created;
            target.modified = source.metadata_modified;
            target.accrualPeriodicity = source.update_cycle;

            // Keywords
            if (source.tags !== null) {
                target.keywords = [];
                source.tags.forEach(tag => {
                    if (tag.display_name !== null) {
                        target.keywords.push(tag.display_name);
                    }
                });
            }

            // Creator
            if (source.author !== null || source.author_email !== null) {
                target.creator = {
                    name: source.author,
                    mbox: source.author_email
                };
            }

            // Organisation
            if (source.organization !== null) {
                target.publisher = {};
                if (source.organization.title !== null) {
                    target.publisher.organization = [source.organization.title];
                    target.publisher.homepage = [];
                }
            }

            // Resources/Distributions
            if (source.resources !== null) {
                target.distribution = [];
                source.resources.forEach(res => {
                    let dist = {
                        id: res.id,
                        title: res.name,
                        description: res.description,
                        accessURL: res.url,
                        format: res.format,
                        issued: res.created,
                        modified: res.last_modified,
                        byteSize: res.size
                    };
                    target.distribution.push(dist);
                });
            }

            // Extras
            target.extras = {
                // TODO subcategories (=mcloud categories)
                license_id: source.license_id,
                license_title: source.license_title,
                license_url: source.license_url
            };

            // Groups
            if (source.groups !== null) {
                target.extras.groups = [];
                source.groups.forEach(group => {
                    target.extras.groups.push(group.display_name);
                });
            }

            // Metadata dates
            let now = new Date(Date.now());
            target.extras.metadata = {
                modified: now,
                harvested: now
            };

            // Execute the mappers
            let theDoc = {};
            this.settings.mapper.forEach(mapper => {
                mapper.run(target, theDoc);
            });
            this.elastic.addDocToBulk(theDoc, theDoc.id);

            // signal finished operation so that the next asynchronous task can run (callback set by async)
            callback();

        } catch (e) {
            log.error("Error: " + e);
        }
    }

    async run() {
        try {

            let self = this;
            let queue = async.queue(function () {
                self.importDataset.call(self, ...arguments);
            }, 10);

            queue.drain = () => {
                log.info( 'queue has been processed' );

                // Prepare the index, send the data to elasticsearch and close the client
                this.elastic.prepareIndex(mapping, settings)
                    .then(() => this.elastic.sendBulkData(false)
                        .then(() => this.elastic.finishIndex())
                    );
            };

            // Fetch datasets 'qs.rows' at a time
            while(true) {
                let json = await request.get(this.options_package_search);
                let results = json.result.results;

                results.forEach(dataset => queue.push(dataset));

                if (results.length < 1) {
                    break;
                } else {
                    this.options_package_search.qs.start += this.options_package_search.qs.rows;
                }
            }

        } catch (err) {
            log.error( 'error:', err );
        }
    }
}

module.exports = GovDataImporter;