/**
 * A mapper for CKAN documents.
 */
import {getLogger} from 'log4js';
import {OptionsWithUri} from 'request-promise';
import {CkanSettings, ProviderField} from './ckan.settings';
import {DateRange, Distribution, GenericMapper, Organization, Person} from '../../model/generic.mapper';
import {CkanParameters, CkanParametersListWithResources, RequestDelegate, RequestPaging} from '../../utils/http-request.utils';
import {UrlUtils} from '../../utils/url.utils';
import {Summary} from '../../model/summary';
import {CkanRules} from './ckan.rules';
import {throwError} from 'rxjs';

let mapping = require('../../../mappings.json');
let markdown = require('markdown').markdown;

export interface CkanMapperData {
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
    private blacklistedFormats: string[] = [];

    constructor(settings: CkanSettings, data: CkanMapperData) {
        super();
        this.settings = settings;
        this.source = data.source;
        this.data = data;
        this.summary = data.summary;

        let hasDataDownloadRule = this.settings.rules
            && this.settings.rules.containsDocumentsWithData
            && this.settings.rules.containsDocumentsWithDataBlacklist;

        if (hasDataDownloadRule) {
            this.blacklistedFormats = this.settings.rules.containsDocumentsWithDataBlacklist
                .split(',')
                .map(item => item.trim());
        }
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
        let person = await this.getDisplayContactByField(this.settings.providerField);

        if (person.length === 0) {
            return [{
                name: this.settings.providerPrefix + this.settings.description
            }];
        }

        return person;
    }

    async getDistributions(): Promise<Distribution[]> {
        let urlErrors = [];
        let distributions: Distribution[] = [];
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
                        format: UrlUtils.mapFormat([res.format], this.summary.warnings),
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
        let rawSource = this.settings.ckanBaseUrl + '/api/3/action/package_show?id=' + this.source.name;
        let portalSource = this.settings.ckanBaseUrl + '/dataset/' + this.source.name;

        return {
            raw_data_source: rawSource,
            portal_link: portalSource,
            attribution: this.settings.defaultAttribution
        };
    }

    getModifiedDate() {
        return this.handleDate(this.source.metadata_modified);
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

    private getMaintainer(): Person[] {
        let maintainer: Person;
        if (this.source.maintainer) {
            maintainer = {
                name: this.settings.providerPrefix + this.source.maintainer,
                mbox: this.source.maintainer_email
            };
        }

        return maintainer ? [maintainer] : [];
    }

    private getAuthor(): Person[] {
        let author: Person;
        if (this.source.author) {
            author = {
                name: this.settings.providerPrefix + this.source.author,
                mbox: this.source.author_email
            };
        }

        return author ? [author] : [];
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

    getThemes(): string[] {
        // see https://joinup.ec.europa.eu/release/dcat-ap-how-use-mdr-data-themes-vocabulary
        // map ckan category to DCAT
        let mappedThemes = [];
        if (this.source.groups) {
            mappedThemes = this.source.groups
                .map(group => group.name)
                .map(groupName => mapping.ckan_dcat[groupName])
                .filter(dcatTheme => dcatTheme !== null && dcatTheme !== undefined);
        }

        if (mappedThemes.length === 0) {
            mappedThemes = this.settings.defaultDCATCategory;
        }
        return mappedThemes
            .map(category => GenericMapper.DCAT_CATEGORY_URL + category);
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
                const tagName = tag.display_name || tag.name;
                if (tagName) {
                    keywords.push(tagName);
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

                if (created) {
                    created = new Date(Date.parse(created));
                }
                if (modified) {
                    modified = new Date(Date.parse(modified));
                }

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
        return this.handleDate(this.source.metadata_created);
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
        const hasNoLicense = !this.source.license_id && !this.source.license_title && !this.source.license_url;

        if (this.settings.defaultLicense && hasNoLicense) {
            this.summary.missingLicense++;
            this.log.warn(`Missing license for ${this.getGeneratedId()} using default one.`);

            return this.settings.defaultLicense;
        } else if (hasNoLicense) {
            let msg = `No license detected for dataset: ${this.getGeneratedId()} -> ${this.getTitle()}`;
            this.summary.missingLicense++;

            this.log.warn(msg);
            this.summary.warnings.push(['Missing license', msg]);
        } else {
            return {
                id: this.source.license_id ? this.source.license_id : 'unknown',
                title: this.source.license_title,
                url: this.source.license_url || this.source.license_title
            };
        }
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

    getSpatial(): any {
        let extras = this.source.extras;
        if (extras) {
            for (let i = 0; i < extras.length; i++) {
                let extra = extras[i];
                if(extra.key === 'spatial') {
                    return JSON.parse(extra.value);
                }
            }
        }
        else if (this.source.spatial) {
            return JSON.parse(this.source.spatial);
        }
        return undefined;
    }

    isValid(doc?: any): boolean {
        if (doc.distribution.length === 0) {
            this.valid = false;
            let msg = `Item will not be displayed in portal because no valid URLs were detected. Id: '${this.source.id}', index: '${this.data.currentIndexName}'.`;
            this.log.warn(msg);
        }

        const isWhitelisted = this.settings.whitelistedIds.indexOf(doc.extras.generated_id) !== -1;

        if (this.blacklistedFormats.length > 0) {

            if (isWhitelisted) {
                this.log.info(`Document is whitelisted and not checked: ${this.source.id}`);
                return super.isValid();
            }

            const result = CkanRules.containsDocumentsWithData(doc.distribution, this.blacklistedFormats);
            if (result.skipped) {
                this.summary.warnings.push(['No data document', `${this.source.title} (${this.source.id})`]);
                this.skipped = true;
            }
            if (!result.valid) {
                this.log.warn(`Document does not contain data links: ${this.source.id}`);
                this.valid = false;
            }
        }
        return super.isValid();
    }

    static createRequestConfig(settings: CkanSettings): OptionsWithUri {

        if (settings.requestType === 'ListWithResources') {
            return {
                method: 'GET',
                uri: settings.ckanBaseUrl + '/api/3/action/current_package_list_with_resources',
                json: true,
                headers: RequestDelegate.defaultRequestHeaders(),
                proxy: settings.proxy || null,
                qs: <CkanParametersListWithResources> {
                    offset: settings.startPosition,
                    limit: settings.maxRecords
                }
            };
        } else {
            let fq;
            if(settings.filterGroups.length > 0 || settings.filterTags.length > 0 || settings.additionalSearchFilter)
            {
                fq = '';
                if(settings.filterGroups.length > 0) {
                    fq += '+groups:(' + settings.filterGroups.join(' OR ') + ')';
                }
                if(settings.filterTags.length > 0) {
                    fq += '+tags:(' + settings.filterTags.join(' OR ') + ')';
                }
                if(settings.additionalSearchFilter){
                    fq += '+'+settings.additionalSearchFilter;
                }
                if(settings.whitelistedIds.length > 0){
                    fq = '(('+fq+ ') OR id:('+settings.whitelistedIds.join(' OR ')+'))'
                }
            }
            return {
                method: 'GET',
                uri: settings.ckanBaseUrl + '/api/action/package_search', // See http://docs.ckan.org/en/ckan-2.7.3/api/
                json: true,
                headers: RequestDelegate.defaultRequestHeaders(),
                proxy: settings.proxy,
                qs: <CkanParameters> {
                    sort: 'id asc',
                    start: settings.startPosition,
                    rows: settings.maxRecords,
                    fq: fq
                }
            };
        }

    }

    static createRequestConfigCount(settings: CkanSettings): OptionsWithUri {
        return {
            method: 'GET',
            uri: settings.ckanBaseUrl + '/api/3/action/package_list', // See http://docs.ckan.org/en/ckan-2.7.3/api/
            json: true,
            headers: RequestDelegate.defaultRequestHeaders(),
            proxy: settings.proxy
        };
    }

    static createPaging(settings: CkanSettings): RequestPaging {
        return {
            startFieldName: settings.requestType === 'ListWithResources' ? 'offset' : 'start',
            startPosition: settings.startPosition,
            numRecords: settings.maxRecords
        };
    }

    private handleDate(date: string | Date): Date {

        let logDateError = () => {
            let message = `Date has incorrect format: ${date}`;
            this.summary.numErrors++;
            this.summary.appErrors.push(message);
            this.log.warn(message);
        };

        if (date instanceof Date) {
            return date;
        } else if (date === null) {
            return null;
        } else {
            if (this.settings.dateSourceFormats && this.settings.dateSourceFormats.length > 0) {
                let dateObj = this.moment(date, this.settings.dateSourceFormats);

                if (dateObj.isValid()) {
                    return dateObj.toDate();
                } else {
                    logDateError();
                    return undefined;
                }
            } else {
                let convertedDate = new Date(date);
                if (isNaN(convertedDate.getTime())) {
                    logDateError();
                    return undefined;
                } else {
                    return convertedDate;
                }
            }
        }
    }

    private handleByteSize(size: any): number {
        if (isNaN(size)) {

            const splittedSize = size.split(' ');
            if (splittedSize.length > 1 && !isNaN(splittedSize[0])) {
                const sizeType = splittedSize[1].toLocaleLowerCase();
                if (this.sizeMap[sizeType] !== undefined) {
                    // round calculated value to prevent floating numbers (e.g. 2.01 * 20 = 20.0999...)
                    return Math.round(splittedSize[0] * this.sizeMap[sizeType]);
                }
            }

            let message = `Byte size has incorrect format: ${size}`;
            this.summary.numErrors++; //.push(message);
            this.summary.appErrors.push(message);
            this.log.warn(message);
            return undefined;
        }

        return size === '' ? undefined : size;
    }

    private async getDisplayContactByField(providerField: ProviderField): Promise<Person[]> {
        switch (providerField) {
            case 'organization':
                const publisher = await this.getPublisher();
                if (publisher.length > 0) {
                    return [{
                        name: this.settings.providerPrefix + (publisher[0].organization ? publisher[0].organization : this.settings.description),
                        homepage: publisher[0].homepage ? publisher[0].homepage : undefined
                    }];
                } else {
                    return [];
                }
            case 'author':
                return this.getAuthor();
            default:
                return this.getMaintainer();
        }
    }

    executeCustomCode(doc: any) {
        try {
            if (this.settings.customCode) {
                eval(this.settings.customCode);
            }
        } catch (error) {
            throwError('An error occurred in custom code: ' + error.message);
        }
    }

    getSummary(): Summary {
        return this.summary;
    }
}

