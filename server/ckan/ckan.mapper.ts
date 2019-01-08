/**
 * A mapper for CKAN documents.
 */
import {GenericMapper} from "../model/generic-mapper";
import {UrlUtils} from "../utils/url-utils";
import {getLogger} from "log4js";

let markdown = require('markdown').markdown;

export class CkanToElasticsearchMapper extends GenericMapper {

    private log = getLogger();

    private data: any;
    private resourcesDate: Date[] = null;

    constructor(data) {
        super();
        this.data = data;
    }

    getAccessRights() {
    }

    getCategories() {
        return this.settings.defaultMcloudSubgroup;
    }

    getCitation() {
    }

    getDescription() {
        return markdown.toHTML(this.data.notes);
    }

    getDisplayContacts() {
    }

    async getDistributions(): Promise<any[]> {
        let urlErrors = [];
        let distributions = [];
        let resources = source.resources;
        if (resources !== null) {
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
                    distributions.push(dist);
                } else {
                    let msg = `Invalid URL '${res.url} found for item with id: '${source.id}', title: '${source.title}', index: '${this.elastic.indexName}'.`;
                    urlErrors.push(msg);
                    this.log.warn(msg);
                }
            }
        }
        return distributions;
    }

    getGeneratedId() {
        return source.name;
    }

    getLicenseTitle() {
        return source.license_title;
    }

    getLicenseId() {
        return source.license_id;
    }

    getLicenseURL() {
        return source.license_url;
    }

    getMFundFKZ() {
    }

    getMFundProjectTitle() {
    }

    getMetadataIssued() {
        return source.metadata_created;
    }

    getMetadataSource() {
    }

    getModifiedDate() {
        return source.metadata_modified;
    }

    getPublisher() {
        let publisher = [];
        if (source.organization !== null) {
            if (source.organization.title !== null) {
                let title = source.organization.title;
                let homepage = source.organization.description;
                let match = homepage.match(/]\(([^)]+)/); // Square bracket followed by text in parentheses
                let org: any = {};

                if (title) org.organization = title;
                if (match) org.homepage = match[1];

                publisher.push(org);
            }
        }

        return publisher;
    }

    getTemporal() {
        let dates = this.getResourcesData();
        return new Date(Math.max(...dates));
    }

    getTemporalStart() {
        let dates = this.getResourcesData();
        return new Date(Math.min(...dates)); // Math.min and Math.max convert items to numbers
    }

    getTemporalEnd() {
        let dates = this.getResourcesData();
        return new Date(Math.max(...dates));
    }

    getThemes() {
        return ['http://publications.europa.eu/resource/authority/data-theme/TRAN']; // see https://joinup.ec.europa.eu/release/dcat-ap-how-use-mdr-data-themes-vocabulary
    }

    getTitle() {
        return this.data.title;
    }

    isRealtime() {
    }

    getAccrualPeriodicity(): string {
        return source.update_cycle;
    }

    getKeywords(): string[] {
        let keywords = [];
        if (source.tags !== null) {
            source.tags.forEach(tag => {
                if (tag.display_name !== null) {
                    keywords.push(tag.display_name);
                }
            });
        }

        return keywords;
    }

    getCreator(): any {
        if (source.author !== null || source.author_email !== null) {
            return {
                name: source.author,
                mbox: source.author_email
            };
        }

        return null;
    }

    getHarvestedData(): string {
        return JSON.stringify(source);
    }

    private getResourcesData() {

        if (this.resourcesDate) {
            return this.resourcesDate;
        }

        let dates = [];
        let resources = source.resources;
        if (resources !== null) {
            for (let i = 0; i < resources.length; i++) {
                let res = resources[i];
                // let accessURL = await UrlUtils.urlWithProtocolFor(res.url);
                // if (accessURL) {
                    let created = res.created;
                    let modified = res.modified;

                    if (created) created = new Date(Date.parse(created));
                    if (modified) modified = new Date(Date.parse(modified));

                    if (created && modified) {
                        dates.push(Math.max(created, modified));
                    } else if (modified) {
                        dates.push(modified);
                    } else if (created) {
                        dates.push(created);
                    }
                // }
            }
        }

        this.resourcesDate = dates;
        return dates;
    }

}
