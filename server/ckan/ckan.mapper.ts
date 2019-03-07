/**
 * A mapper for CKAN documents.
 */
import {GenericMapper, Organization, Person} from "../model/generic-mapper";
import {UrlUtils} from "../utils/url-utils";
import {getLogger} from "log4js";
import {RequestConfig, RequestDelegate} from "../utils/http-request-utils";

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
        return undefined;
    }

    getCategories() {
        return this.settings.defaultMcloudSubgroup;
    }

    getCitation() {
        return undefined;
    }

    getDescription() {
        return markdown.toHTML(this.data.notes);
    }

    async getDisplayContacts() {

        let publisher = await this.getPublisher();

        let contact: Person = {
            name: publisher[0].organization ? publisher[0].organization : undefined,
            homepage: publisher[0].homepage ? publisher[0].homepage : undefined
        };

        return [contact];
    }

    async getDistributions(): Promise<any[]> {
        let urlErrors = [];
        let distributions = [];
        let resources = this.data.resources;
        if (resources !== null) {
            for(let i=0; i<resources.length; i++) {
                let res = resources[i];

                let requestConfig = this.getUrlCheckRequestConfig(res.url);
                let accessURL = await UrlUtils.urlWithProtocolFor(requestConfig);

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
        this.errors.push(...urlErrors);

        if (distributions.length === 0) {
            this.valid = false;
            let msg = `Item will not be displayed in portal because no valid URLs were detected. Id: '${this.data.id}', index: '${this.settings.currentIndexName}'.`;
            this.log.warn(msg);
        }

        return distributions;
    }

    getGeneratedId() {
        return this.data.name;
    }

    getMFundFKZ() {
        return undefined;
    }

    getMFundProjectTitle() {
        return undefined;
    }

    getMetadataIssued() {
        return this.settings.issuedDate ? new Date(this.settings.issuedDate) : new Date(Date.now());
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
        return this.data.metadata_modified instanceof Date ? this.data.metadata_modified : new Date(this.data.metadata_modified);
    }

    async getPublisher(): Promise<Organization[]> {
        let publisher: Organization;
        if (this.data.organization !== null) {
            if (this.data.organization.title !== null) {
                let homepage = this.data.organization.description;
                let match = homepage.match(/]\(([^)]+)/); // Square bracket followed by text in parentheses
                publisher = {
                    organization: this.data.organization.title,
                    homepage: match ? match[1] : undefined
                };
            }
        }

        return [publisher];
    }

    getTemporal() {
        let dates = this.getResourcesData();
        let minDate = new Date(Math.min(...dates)); // Math.min and Math.max convert items to numbers
        let maxDate = new Date(Math.max(...dates));

        if (minDate.toISOString() !== maxDate.toISOString()) {
            return undefined;
        } else if (maxDate) {
            return maxDate.toISOString();
        } else if (minDate) {
            return minDate.toISOString();
        }
        return undefined;
    }

    getTemporalStart() {
        let dates = this.getResourcesData();
        let minDate = new Date(Math.min(...dates)); // Math.min and Math.max convert items to numbers
        let maxDate = new Date(Math.max(...dates));

        if (minDate && maxDate && minDate.getTime() != maxDate.getTime()) {
            return minDate; // Math.min and Math.max convert items to numbers
        }
        return undefined;
    }

    getTemporalEnd() {
        let dates = this.getResourcesData();
        let minDate = new Date(Math.min(...dates)); // Math.min and Math.max convert items to numbers
        let maxDate = new Date(Math.max(...dates));

        if (minDate && maxDate && minDate.getTime() != maxDate.getTime()) {
            return maxDate;
        }
        return undefined;
    }

    getThemes() {
        // see https://joinup.ec.europa.eu/release/dcat-ap-how-use-mdr-data-themes-vocabulary
        return this.settings.defaultDCATCategory ? [ GenericMapper.DCAT_CATEGORY_URL + this.settings.defaultDCATCategory] : undefined;
    }

    getTitle() {
        return this.data.title;
    }

    isRealtime() {
        return undefined;
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

    getCreator(): Person {
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
        return this.data.metadata_created instanceof Date ? this.data.metadata_created : new Date(this.data.metadata_created);
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

    getContactPoint(): any {
        return undefined;
    }

    getOriginator(): Person[] {
        return [{
            name: this.data.author,
            mbox: this.data.author_email
        }];
    }

    async getLicense() {
        return {
            id: this.data.license_id ? this.data.license_id : 'unknown',
            title: this.data.license_title,
            url: this.data.license_url
        };
    }

    getUrlCheckRequestConfig(uri: string): RequestConfig {
        let config: RequestConfig = {
            method: 'GET',
            json: false,
            headers: RequestDelegate.defaultRequestHeaders(),
            qs: {},
            uri: uri
        };

        if (this.settings.proxy) {
            config.proxy = this.settings.proxy;
        }

        return config;
    }
}
