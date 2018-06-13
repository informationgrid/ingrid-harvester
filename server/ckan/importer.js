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
        this.promises = [];

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
            log.debug("Processing CKAN dataset: " + source.name + " from data-source: " + this.settings.ckanBaseUrl);

            let target = {};
            let name = source.name;

            let id = source.id;
            target.id = name;
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
                    let title = source.organization.title;
                    let homepage = source.organization.description;

                    if (title !== null) {
                        target.publisher.organization = [title];
                    }
                    if (homepage !== null) {
                        target.publisher.homepage = [homepage];
                    }
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
            let subgroup = this.settings.defaultMcloudSubgroup;
            target.extras = {
                subgroups: subgroup,
                license_id: source.license_id,
                license_title: source.license_title,
                license_url: source.license_url,
                harvested_data: JSON.stringify(source)
            };

            // Groups
            if (source.groups !== null) {
                target.extras.groups = [];
                source.groups.forEach(group => {
                    target.extras.groups.push(group.display_name);
                });
            }

            // Metadata
            // The harvest source
            let upstream = this.settings.ckanBaseUrl + "/api/3/action/package_show?id=" + name;

            // Dates
            let now = new Date(Date.now());
            let issued = null;

            let existing = await this.elastic.searchById(source.id);
            if (existing.hits.total > 0) {
                let firstHit = existing.hits.hits[0]._source;
                if (firstHit.extras.metadata.issued !== null) {
                    issued = firstHit.extras.metadata.issued;
                }
            }
            if (typeof  issued === "undefined" || issued === null) {
                issued = now;
            }

            target.extras.metadata = {
                source: upstream,
                issued: issued,
                modified: now,
                harvested: now
            };

            // Execute the mappers
            let theDoc = {};
            this.settings.mapper.forEach(mapper => {
                mapper.run(target, theDoc);
            });
            let promise = this.elastic.addDocToBulk(theDoc, id);
            this.promises.push(promise);

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
                    .then(() => this.elastic.sendBulkData(false))
                    .then(() => Promise.all(this.promises))
                    .then(() => this.elastic.finishIndex());
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