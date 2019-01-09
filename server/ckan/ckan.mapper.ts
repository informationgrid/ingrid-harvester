/**
 * A mapper for CKAN documents.
 */
import {GenericMapper} from "../model/generic-mapper";
import {UrlUtils} from "../utils/url-utils";
import {getLogger} from "log4js";

let markdown = require('markdown').markdown;

export class CkanToElasticsearchMapper extends GenericMapper {

    private log = getLogger();

    private readonly data: any;
    private resourcesDate: Date[] = null;
    private settings: any;

    constructor(settings, data) {
        super();
        this.settings = settings;
        this.data = data;
    }

    getErrors() {
        return this.errors;
    }

    getAccessRights() {
        return null;
    }

    getCategories() {
        return this.settings.defaultMcloudSubgroup;
    }

    getCitation() {
        return null;
    }

    getDescription() {
        return markdown.toHTML(this.data.notes);
    }

    async getDisplayContacts() {
        let contact: any = {};

        let publisher = await this.getPublisher();
        if (publisher[0].organization) {
            contact.name = publisher[0].organization;
        }

        if (publisher[0].homepage) {
            contact.url = publisher[0].homepage;
        }

        return contact;
    }

    async getDistributions(): Promise<any[]> {
        let urlErrors = [];
        let distributions = [];
        let resources = this.data.resources;
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
                    let msg = `Invalid URL '${res.url} found for item with id: '${this.data.id}', title: '${this.data.title}', index: '${this.settings.currentIndexName}'.`;
                    urlErrors.push(msg);
                    this.log.warn(msg);
                }
            }
        }
        this.errors = urlErrors;

        return distributions;
    }

    getGeneratedId() {
        return this.data.name;
    }

    getLicenseTitle() {
        return this.data.license_title;
    }

    getLicenseId() {
        return this.data.license_id;
    }

    getLicenseURL() {
        return this.data.license_url;
    }

    getMFundFKZ() {
        return null;
    }

    getMFundProjectTitle() {
        return null;
    }

    getMetadataIssued() {
        return new Date(Date.now());
    }

    getMetadataSource() {
        // Metadata
        // The harvest source
        let rawSource = this.settings.ckanBaseUrl + "/api/3/action/package_show?id=" + this.data.name;
        let portalSource = this.settings.ckanBaseUrl + '/dataset/' + this.data.name;

        return {
            raw_data_source: rawSource,
            portal_link: portalSource,
            attribution: 'Deutsche Bahn Datenportal'
        };
    }

    getModifiedDate() {
        return this.data.metadata_modified;
    }

    async getPublisher() {
        let publisher = [];
        if (this.data.organization !== null) {
            if (this.data.organization.title !== null) {
                let title = this.data.organization.title;
                let homepage = this.data.organization.description;
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
        let minDate = new Date(Math.min(...dates)); // Math.min and Math.max convert items to numbers
        let maxDate = new Date(Math.max(...dates));

        if (maxDate) {
            return maxDate;
        } else if (minDate) {
            return minDate;
        }
        return null;
    }

    getTemporalStart() {
        let dates = this.getResourcesData();
        let minDate = new Date(Math.min(...dates)); // Math.min and Math.max convert items to numbers
        let maxDate = new Date(Math.max(...dates));

        if (minDate && maxDate && minDate.getTime() != maxDate.getTime()) {
            return minDate; // Math.min and Math.max convert items to numbers
        }
        return null;
    }

    getTemporalEnd() {
        let dates = this.getResourcesData();
        let minDate = new Date(Math.min(...dates)); // Math.min and Math.max convert items to numbers
        let maxDate = new Date(Math.max(...dates));

        if (minDate && maxDate && minDate.getTime() != maxDate.getTime()) {
            return maxDate;
        }
        return null;
    }

    getThemes() {
        return ['http://publications.europa.eu/resource/authority/data-theme/TRAN']; // see https://joinup.ec.europa.eu/release/dcat-ap-how-use-mdr-data-themes-vocabulary
    }

    getTitle() {
        return this.data.title;
    }

    isRealtime() {
        return null;
    }

    getAccrualPeriodicity(): string {
        return this.data.update_cycle;
    }

    getKeywords(): string[] {
        let keywords = [];
        if (this.data.tags !== null) {
            this.data.tags.forEach(tag => {
                if (tag.display_name !== null) {
                    keywords.push(tag.display_name);
                }
            });
        }

        return keywords;
    }

    getHarvestedData(): string {
        return JSON.stringify(this.data);
    }

    private getResourcesData() {

        if (this.resourcesDate) {
            return this.resourcesDate;
        }

        let dates = [];
        let resources = this.data.resources;
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

    getCreator() {
        return {
            name: this.data.author,
            mbox: this.data.author_email
        };
    }

    getGroups(): string[] {
        let groups = [];

        // Groups
        if (this.data.groups !== null) {
            groups = [];
            this.data.groups.forEach(group => {
                groups.push(group.display_name);
            });
        }

        return groups;
    }

    getIssued(): Date {
        return this.data.metadata_created;
    }

    getMetadataHarvested(): Date {
        return this.settings.harvestTime;
    }

    getSubSections(): any[] {
        let subsections = [];

        // Extra information from the Deutsche Bahn portal
        if (this.data.description) {
            subsections.push({
                title: 'Langbeschreibung',
                description: markdown.toHTML(this.data.description)
            });
        }

        if (this.data.license_detailed_description) {
            subsections.push({
                title: 'Lizenzbeschreibung',
                description: this.data.license_detailed_description
            });
        }

        if (this.data.haftung_description) {
            subsections.push({
                title: 'Haftungsausschluss',
                description: this.data.haftung_description
            });
        }
        return subsections;
    }

}
