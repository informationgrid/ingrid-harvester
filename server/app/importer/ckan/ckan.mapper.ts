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
import {throwError} from 'rxjs';
import {ImporterSettings} from "../../importer.settings";
import {DcatPeriodicityUtils} from "../../utils/dcat.periodicity.utils";
import {DcatLicensesUtils} from "../../utils/dcat.licenses.utils";

let mapping = require('../../../mappings.json');
let markdown = require('markdown').markdown;

export interface CkanMapperData {
    harvestTime: Date;
    storedData: any;
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

        super.init();
    }

    protected getSettings(): ImporterSettings {
        return this.settings;
    }

    protected getSummary(): Summary{
        return this.summary;
    }

    _getAccessRights() {
        return undefined;
    }

    _getCategories() {
        let subgroups = [];
        let keywords = this.getKeywords();
        if (keywords) {
            keywords.forEach(k => {
                k = k.trim();
                if (k === 'mcloud_category_roads' || k === 'mcloud-kategorie-straßen') subgroups.push('roads');
                if (k === 'mcloud_category_climate' || k === 'mcloud-kategorie-klima-und-wetter') subgroups.push('climate');
                if (k === 'mcloud_category_waters' || k === 'mcloud-kategorie-wasserstraßen-und-gewässer') subgroups.push('waters');
                if (k === 'mcloud_category_railway' || k === 'mcloud-kategorie-bahn') subgroups.push('railway');
                if (k === 'mcloud_category_infrastructure' || k === 'mcloud-kategorie-infrastuktur') subgroups.push('infrastructure');
                if (k === 'mcloud_category_aviation' || k === 'mcloud-kategorie-luft--und-raumfahrt') subgroups.push('aviation');
            });
        }
        if (subgroups.length === 0) subgroups.push(...this.settings.defaultMcloudSubgroup);
        return subgroups;
    }

    _getCitation() {
        return undefined;
    }

    _getDescription() {
        if (this.source.notes) {
            return this.settings.markdownAsDescription ? markdown.toHTML(this.source.notes) : this.source.notes;
        } else {
            return undefined;
        }
    }

    async _getDisplayContacts() {
        let person = await this.getDisplayContactByField(this.settings.providerField);

        if (person.length === 0) {
            return [{
                name: this.settings.providerPrefix + this.settings.description.trim()
            }];
        }

        return person;
    }

    async _getDistributions(): Promise<Distribution[]> {
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
                        accessURL: this.cleanupURL(accessURL),
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

    private cleanupURL(url: string):string {
        if(url.indexOf('<') !== -1 && url.indexOf('>') !== -1 ){
            let pos1 = url.indexOf('>http');
            if(pos1 !== -1){
                let pos2 = url.indexOf('<', pos1);
                if(pos2 > pos1){
                    url = url.substring(pos1+1, pos2);
                }
            }
        }

        if(url.indexOf('\\') !== -1)
        {
            url = url.replace('\\', '/')
        }

        return url;
    }

    _getGeneratedId() {
        return this.source.id;
    }

    _getMetadataIssued() {
        return (this.data.storedData && this.data.storedData.issued) ? new Date(this.data.storedData.issued) : new Date(Date.now());
    }

    _getMetadataModified(): Date {
        if(this.data.storedData && this.data.storedData.modified && this.data.storedData.dataset_modified){
            let storedDataset_modified: Date = new Date(this.data.storedData.dataset_modified);
            if(storedDataset_modified.valueOf() === this.getModifiedDate().valueOf()  )
                return new Date(this.data.storedData.modified);
        }
        return new Date(Date.now());
    }

    _getMetadataSource() {
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

    _getModifiedDate() {
        return this.handleDate(this.source.metadata_modified);
    }

    async _getPublisher(): Promise<Organization[]> {
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
                name: this.settings.providerPrefix + this.source.maintainer.trim(),
                mbox: this.source.maintainer_email
            };
        }

        return maintainer ? [maintainer] : [];
    }

    private getAuthor(): Person[] {
        let author: Person;
        if (this.source.author) {
            author = {
                name: this.settings.providerPrefix + this.source.author.trim(),
                mbox: this.source.author_email
            };
        }

        return author ? [author] : [];
    }

    _getTemporal(): DateRange[] {
        let from = this.getTemporalFrom();
        let to = this.getTemporalTo()

        if (from || to) {
            return [{
                gte: from,
                lte: to
            }];
        }

        return undefined;
    }

    getTemporalFrom(): Date {
        if(this.source.temporal_coverage_from){
            return this.handleDate(this.source.temporal_coverage_from);
        }
        let extras = this.source.extras;
        if (extras) {
            for (let i = 0; i < extras.length; i++) {
                let extra = extras[i];
                if((extra.key === 'temporal_coverage_from' || extra.key === 'temporal_start') && extra.value) {
                    return this.handleDate(extra.value);
                }
            }
        }

        return undefined;
    }

    getTemporalTo(): Date {
        if(this.source.temporal_coverage_to){
            return this.handleDate(this.source.temporal_coverage_to);
        }
        let extras = this.source.extras;
        if (extras) {
            for (let i = 0; i < extras.length; i++) {
                let extra = extras[i];
                if((extra.key === 'temporal_coverage_to' || extra.key === 'temporal_end') && extra.value) {
                    return this.handleDate(extra.value);
                }
            }
        }

        return undefined;
    }

    _getThemes(): string[] {
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

    _getTitle() {
        return this.source.title;
    }

    _isRealtime() {
        return undefined;
    }

    _getAccrualPeriodicity(): string {
        let raw = undefined;

        if(this.source.update_cycle){
            raw = this.source.update_cycle;
        }

        if(!raw && this.source.temporal_granularity){
            raw = this.source.temporal_granularity;
        }

        if(!raw && this.source.frequency){
            raw = this.source.frequency;
        }

        if(!raw && this.source.extras){
            let extras = this.source.extras;
            let temporal_granularity = extras.find(extra => extra.key === 'temporal_granularity');
            if(temporal_granularity){
                raw = temporal_granularity.value;

                let temporal_granularity_factor = extras.find(extra => extra.key === 'temporal_granularity_factor');
                if(temporal_granularity_factor && temporal_granularity_factor.value !== "1"){
                    raw = temporal_granularity_factor.value + ' ' + temporal_granularity.value;
                }
            }
        }


        let result = undefined;
        if(raw){
            result = DcatPeriodicityUtils.getPeriodicity(raw);
            if(!result){
                    this.summary.warnings.push(["Unbekannte Periodizität", raw]);
            }
        }

        return result;
    }

    _getKeywords(): string[] {
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

    _getHarvestedData(): string {
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

    _getCreator(): Person {
        return {
            name: this.source.author,
            mbox: this.source.author_email
        };
    }

    _getGroups(): string[] {
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

    _getIssued(): Date {
        return this.handleDate(this.source.metadata_created);
    }

    _getMetadataHarvested(): Date {
        return this.data.harvestTime;
    }

    _getSubSections(): any[] {
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

    _getContactPoint(): any {
        return undefined;
    }

    _getOriginator(): Person[] {
        return undefined;
    }

    async _getLicense() {
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
            let license = await DcatLicensesUtils.get(this.source.license_url);
            if(license) return license;
            license = await DcatLicensesUtils.get(this.source.license_title);
            if(license) return license;
            return {
                id: this.source.license_id ? this.source.license_id : 'unknown',
                title: this.source.license_title,
                url: this.source.license_url || this.source.license_title
            };
        }
    }

    _getUrlCheckRequestConfig(uri: string): OptionsWithUri {
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

    _getSpatial(): any {
        let extras = this.source.extras;
        if (extras) {
            for (let i = 0; i < extras.length; i++) {
                let extra = extras[i];
                if(extra.key === 'spatial') {
                    return this.checkAndFixSpatialData(JSON.parse(extra.value));
                }
            }
        }
        else if (this.source.spatial) {
            return this.checkAndFixSpatialData(JSON.parse(this.source.spatial));
        }
        return undefined;
    }

    checkAndFixSpatialData(spatial : any): any {
        if(spatial.coordinates) {
            spatial.coordinates = this.checkAndFixSpatialCoordinates(spatial.coordinates);
        }
        return spatial;
    }

    checkAndFixSpatialCoordinates(coordinates : any): any {
        if(coordinates instanceof Array && coordinates[0] instanceof Array && coordinates[0][0] instanceof Array) {
            for (let i = 0; i < coordinates.length; i++) {
                coordinates[i] = this.checkAndFixSpatialCoordinates(coordinates[i]);
            }
        }
        else if (coordinates instanceof Array) {
            for (let i = 1; i < coordinates.length; i++) {
                if((coordinates[i-1][0] === coordinates[i][0]) && (coordinates[i-1][1] === coordinates[i][1])){
                    coordinates.splice(i--, 1);
                }
            }
        }
        return coordinates;
    }


    _getSpatialText(): string {
        let extras = this.source.extras;
        if (extras) {
            for (let i = 0; i < extras.length; i++) {
                let extra = extras[i];
                if(extra.key === 'opennrw_spatial' || extra.key === 'spatial_text' || extra.key === 'spatial-text') {
                    return extra.value;
                }
            }
        }
        return undefined;
    }


    static createRequestConfig(settings: CkanSettings): OptionsWithUri {

        if (settings.requestType === 'ListWithResources') {
            return {
                method: 'GET',
                uri: settings.ckanBaseUrl + '/api/3/action/current_package_list_with_resources',
                json: true,
                headers: RequestDelegate.defaultRequestHeaders(),
                proxy: settings.proxy || null,
                agentOptions: {
                    rejectUnauthorized: settings.rejectUnauthorizedSSL
                },
                rejectUnauthorized: settings.rejectUnauthorizedSSL,
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
                agentOptions: {
                    rejectUnauthorized: settings.rejectUnauthorizedSSL
                },
                rejectUnauthorized: settings.rejectUnauthorizedSSL,
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
            proxy: settings.proxy,
            agentOptions: {
                rejectUnauthorized: settings.rejectUnauthorizedSSL
            },
            rejectUnauthorized: settings.rejectUnauthorizedSSL
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
                const publisher = await this._getPublisher();
                if (publisher.length > 0) {
                    return [{
                        name: this.settings.providerPrefix + (publisher[0].organization ? publisher[0].organization.trim() : this.settings.description.trim()),
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
}

