'use strict';

let request = require( 'request-promise' ),
    Promise = require('promise'),
    log = require( 'log4js' ).getLogger( __filename ),
    markdown = require('markdown').markdown,
    ElasticSearchUtils = require( '../elastic-utils' ),
    Utils = require('./../common-utils'),
    UrlUtils = require('./../url-utils'),
    settings = require('../elastic.settings.js'),
    mapping = require( '../elastic.mapping.js' );

class DeutscheBahnCkanImporter {

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
     * @param args { sourceJson, issuedExisting, harvestTime }
     * @returns {Promise<*|Promise>}
     */
    async importDataset(args) {
        let source = args.data;
        let issuedExisting = args.issued;
        let harvestTime = args.harvestTime;
        try {
            log.debug("Processing CKAN dataset: " + source.name + " from data-source: " + this.settings.ckanBaseUrl);

            let target = {};
            let name = source.name;

            let id = source.id;
            target.title = source.title;
            target.description = markdown.toHTML(source.notes);
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
                if (source.organization.title !== null) {
                    target.publisher = [];

                    let title = source.organization.title;
                    let homepage = source.organization.description;
                    let match = homepage.match(/]\(([^)]+)/); // Square bracket followed by text in parentheses
                    let org = {};

                    if (title) org.organization = title;
                    if (match) org.homepage = match[1];

                    target.publisher.push(org);
                }
            }

            // Resources/Distributions
            let urlErrors = [];
            let resourceDates = [];
            let resources = source.resources;
            if (resources !== null) {
                target.distribution = [];
                for(let i=0; i<resources.length; i++) {
                    let res = resources[i];
                    let accessURL = await UrlUtils.urlWithProtocolFor(res.url);
                    if (accessURL) {
                        let dist = {
                            id: res.id,
                            title: res.name,
                            description: res.description,
                            accessURL: accessURL,
                            format: res.format,
                            issued: res.created,
                            modified: res.last_modified,
                            byteSize: res.size
                        };
                        target.distribution.push(dist);

                        let created = res.created;
                        let modified = res.modified;

                        if (created) created = new Date(Date.parse(created));
                        if (modified) modified = new Date(Date.parse(modified));

                        if (created && modified) {
                            resourceDates.push(Math.max(created, modified));
                        } else if (modified) {
                            resourceDates.push(modified);
                        } else if (created) {
                            resourceDates.push(created);
                        }
                    } else {
                        let msg = `Invalid URL '${res.url} found for item with id: '${source.id}', title: '${source.title}', index: '${this.elastic.indexName}'.`;
                        urlErrors.push(msg);
                        log.warn(msg);
                    }
                }
            }

            // Extras
            let subgroup = this.settings.defaultMcloudSubgroup;
            target.extras = {
                generated_id: name,
                subgroups: subgroup,
                license_id: source.license_id,
                license_title: source.license_title,
                license_url: source.license_url,
                harvested_data: JSON.stringify(source),
                subsection: []
            };

            // extras.temporal -> Aktualität der Daten
            let minDate = new Date(Math.min(...resourceDates)); // Math.min and Math.max convert items to numbers
            let maxDate = new Date(Math.max(...resourceDates));

            if (minDate && maxDate && minDate.getTime() == maxDate.getTime()) {
                target.extras.temporal = maxDate;
            } else if (minDate && maxDate) {
                target.extras.temporal_start = minDate;
                target.extras.temporal_end = maxDate;
            } else if (maxDate) {
                target.extras.temporal = maxDate;
            } else if (minDate) {
                target.extras.temporal = minDate;
            }

            // Groups
            if (source.groups !== null) {
                target.extras.groups = [];
                source.groups.forEach(group => {
                    target.extras.groups.push(group.display_name);
                });
            }

            // Metadata
            // The harvest source
            let rawSource = this.settings.ckanBaseUrl + "/api/3/action/package_show?id=" + name;
            let portalSource = this.settings.ckanBaseUrl + '/dataset/' + name;

            // Dates
            let now = new Date(Date.now());
            let issued = issuedExisting ? issuedExisting : now;

            target.extras.metadata = {
                source: {
                    raw_data_source: rawSource,
                    portal_link: portalSource,
                    attribution: 'Deutsche Bahn Datenportal'
                },
                issued: issued,
                modified: now,
                harvested: harvestTime
            };

            // Extra information from the Deutsche Bahn portal
            if (source.description) {
                target.extras.subsection.push({
                    title: 'Langbeschreibung',
                    description: markdown.toHTML(source.description)
                });
            }

            if (source.license_detailed_description) {
                target.extras.subsection.push({
                    title: 'Lizenzbeschreibung',
                    description: source.license_detailed_description
                });
            }

            if (source.haftung_description) {
                target.extras.subsection.push({
                    title: 'Haftungsausschluss',
                    description: source.haftung_description
                });
            }

            // Extra checks
            if (!target.distribution || target.distribution.length === 0) {
                target.extras.metadata.isValid = false;
                let msg = `Item will not be displayed in portal because no valid URLs were detected. Id: '${source.id}', title: '${source.title}', index: '${this.elastic.indexName}'.`;
                log.warn(msg);
            }
            if (urlErrors.length > 0) {
                target.extras.metadata.harvesting_errors = urlErrors;
            }
            Utils.postProcess(target);

            // Execute the mappers
            let theDoc = {};
            this.settings.mapper.forEach(mapper => {
                mapper.run(target, theDoc);
            });

            let promise = this.elastic.addDocToBulk(theDoc, id);

            return promise ? promise : new Promise(resolve => resolve());
        } catch (e) {
            log.error("Error: " + e);
        }
    }

    async run() {
        try {
            if (this.settings.dryRun) {
                log.debug('Dry run option enabled. Skipping index creation.');
            } else {
                await this.elastic.prepareIndex(mapping, settings);
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

module.exports = DeutscheBahnCkanImporter;
