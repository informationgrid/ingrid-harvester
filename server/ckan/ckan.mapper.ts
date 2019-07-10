/**
 * A mapper for CKAN documents.
 */
import {DateRange, GenericMapper, Organization, Person} from "../model/generic.mapper";
import {UrlUtils} from "../utils/url.utils";
import {getLogger} from "log4js";
import {CkanParameters, CkanParametersListWithResources, RequestDelegate, RequestPaging} from "../utils/http-request.utils";
import {OptionsWithUri} from "request-promise";
import {CkanSettings} from "./ckan.importer";
import {Summary} from '../model/summary';

let markdown = require('markdown').markdown;

interface CkanMapperData {
    harvestTime: Date;
    issuedDate: Date;
    source: any;
    currentIndexName: string;
    summary: Summary;
}

export class CkanMapper extends GenericMapper {

    private log = getLogger();

    private readonly source: any;
    private readonly data: CkanMapperData;
    private resourcesDate: Date[] = null;
    private settings: CkanSettings;
    private summary: Summary;

    constructor(settings: CkanSettings, data: CkanMapperData) {
        super();
        this.settings = settings;
        this.source = data.source;
        this.data = data;
        this.summary = data.summary;
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
        if (this.source.notes) {
            return this.settings.markdownAsDescription ? markdown.toHTML(this.source.notes) : this.source.notes;
        } else {
            return undefined;
        }
    }

    async getDisplayContacts() {

        let publisher = await this.getPublisher();

        let contact: Person;
        if (publisher.length === 0) {
            contact = {
                name: this.settings.description
            }
        } else {
            contact = {
                name: publisher[0].organization ? publisher[0].organization : this.settings.description,
                homepage: publisher[0].homepage ? publisher[0].homepage : undefined
            }
        }

        return [contact];
    }

    async getDistributions(): Promise<any[]> {
        let urlErrors = [];
        let distributions = [];
        let resources = this.source.resources;
        if (resources !== null) {
            for (let i = 0; i < resources.length; i++) {
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
                        issued: this.handleDate(res.created),
                        modified: this.handleDate(res.last_modified),
                        byteSize: this.handleByteSize(res.size)
                    };
                    distributions.push(dist);
                } else {
                    let msg = `Invalid URL '${res.url} found for item with id: '${this.source.id}', title: '${this.source.title}', index: '${this.data.currentIndexName}'.`;
                    urlErrors.push(msg);
                    this.log.warn(msg);
                }
            }
        }
        this.errors.push(...urlErrors);

        if (distributions.length === 0) {
            this.valid = false;
            let msg = `Item will not be displayed in portal because no valid URLs were detected. Id: '${this.source.id}', index: '${this.data.currentIndexName}'.`;
            this.log.warn(msg);
        }

        return distributions;
    }

    getGeneratedId() {
        return this.source.id;
    }

    getMFundFKZ() {
        return undefined;
    }

    getMFundProjectTitle() {
        return undefined;
    }

    getMetadataIssued() {
        return this.data.issuedDate ? new Date(this.data.issuedDate) : new Date(Date.now());
    }

    getMetadataSource() {
        // Metadata
        // The harvest source
        let rawSource = this.settings.ckanBaseUrl + "/api/3/action/package_show?id=" + this.source.name;
        let portalSource = this.settings.ckanBaseUrl + '/dataset/' + this.source.name;

        return {
            raw_data_source: rawSource,
            portal_link: portalSource,
            attribution: this.settings.defaultAttribution
        };
    }

    getModifiedDate() {
        return this.source.metadata_modified instanceof Date ? this.source.metadata_modified : new Date(this.source.metadata_modified);
    }

    async getPublisher(): Promise<Organization[]> {
        let publisher: Organization;
        if (this.source.organization && this.source.organization.title) {
            let homepage = this.source.organization.description;
            let match = homepage.match(/]\(([^)]+)/); // Square bracket followed by text in parentheses
            publisher = {
                organization: this.source.organization.title,
                homepage: match ? match[1] : undefined
            };
        }

        return publisher ? [publisher] : [];
    }

    getTemporal(): DateRange {
        let dates = this.getResourcesData();
        let minDate = new Date(Math.min(...dates)); // Math.min and Math.max convert items to numbers
        let maxDate = new Date(Math.max(...dates));

        if (minDate && maxDate) {
            return {
                start: minDate,
                end: maxDate
            };
        } else if (maxDate) {
            return {
                start: maxDate,
                end: maxDate
            };
        } else if (minDate) {
            return {
                start: minDate,
                end: minDate
            };
        }
        return undefined;
    }

    getThemes() {
        // see https://joinup.ec.europa.eu/release/dcat-ap-how-use-mdr-data-themes-vocabulary
        return this.settings.defaultDCATCategory ? [GenericMapper.DCAT_CATEGORY_URL + this.settings.defaultDCATCategory] : undefined;
    }

    getTitle() {
        return this.source.title;
    }

    isRealtime() {
        return undefined;
    }

    getAccrualPeriodicity(): string {
        return this.source.update_cycle;
    }

    getKeywords(): string[] {
        let keywords = [];
        if (this.source.tags) {
            this.source.tags.forEach(tag => {
                if (tag.display_name !== null) {
                    keywords.push(tag.display_name);
                }
            });
        }

        return keywords;
    }

    getHarvestedData(): string {
        return JSON.stringify(this.source);
    }

    private getResourcesData() {

        if (this.resourcesDate) {
            return this.resourcesDate;
        }

        let dates = [];
        let resources = this.source.resources;
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
            name: this.source.author,
            mbox: this.source.author_email
        };
    }

    getGroups(): string[] {
        let groups = [];

        // Groups
        if (this.source.groups) {
            groups = [];
            this.source.groups.forEach(group => {
                groups.push(group.display_name);
            });
        }

        return groups;
    }

    getIssued(): Date {
        return this.source.metadata_created instanceof Date ? this.source.metadata_created : new Date(this.source.metadata_created);
    }

    getMetadataHarvested(): Date {
        return this.data.harvestTime;
    }

    getSubSections(): any[] {
        let subsections = [];

        // Extra information
        if (this.source.description) {
            subsections.push({
                title: 'Langbeschreibung',
                description: markdown.toHTML(this.source.description)
            });
        }

        if (this.source.license_detailed_description) {
            subsections.push({
                title: 'Lizenzbeschreibung',
                description: this.source.license_detailed_description
            });
        }

        if (this.source.haftung_description) {
            subsections.push({
                title: 'Haftungsausschluss',
                description: this.source.haftung_description
            });
        }
        return subsections;
    }

    getContactPoint(): any {
        return undefined;
    }

    getOriginator(): Person[] {
        return [{
            name: this.source.author,
            mbox: this.source.author_email
        }];
    }

    async getLicense() {
        return {
            id: this.source.license_id ? this.source.license_id : 'unknown',
            title: this.source.license_title,
            url: this.source.license_url
        };
    }

    getUrlCheckRequestConfig(uri: string): OptionsWithUri {
        let config: OptionsWithUri = {
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

    static createRequestConfig(settings: CkanSettings): OptionsWithUri {

        if (settings.requestType === 'ListWithResources') {
            return {
                method: 'GET',
                uri: settings.ckanBaseUrl + "/api/3/action/current_package_list_with_resources",
                json: true,
                headers: RequestDelegate.defaultRequestHeaders(),
                proxy: settings.proxy || null,
                qs: <CkanParametersListWithResources>{
                    offset: settings.startPosition,
                    limit: settings.maxRecords
                }
            };
        } else {
            return {
                method: 'GET',
                uri: settings.ckanBaseUrl + "/api/action/package_search", // See http://docs.ckan.org/en/ckan-2.7.3/api/
                json: true,
                headers: RequestDelegate.defaultRequestHeaders(),
                proxy: settings.proxy,
                qs: <CkanParameters>{
                    sort: "id asc",
                    start: settings.startPosition,
                    rows: settings.maxRecords/*,
                    fq: 'groups:transport_verkehr'*/
                }
            };
        }

    }

    static createPaging(settings: CkanSettings): RequestPaging {
        return {
            startFieldName: settings.requestType === "ListWithResources" ? 'offset' : 'start',
            startPosition: settings.startPosition,
            numRecords: settings.maxRecords
        };
    }

    private handleDate(date: string) {
        if (isNaN(new Date(date).getTime())) {
            let message = `Date has incorrect format: ${date}`;
            this.summary.numErrors++; //.push(message);
            this.log.warn(message);
            return undefined;
        }

        return date;
    }

    private handleByteSize(size: any): number {
        if (isNaN(size)) {
            let message = `Byte size has incorrect format: ${size}`;
            this.summary.numErrors++; //.push(message);
            this.log.warn(message);
            return undefined;
        }

        return size === '' ? undefined : size;
    }
}

