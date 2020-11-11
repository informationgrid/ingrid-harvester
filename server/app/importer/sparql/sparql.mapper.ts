/**
 * A mapper for ISO-XML documents harvested over CSW.
 */
import {Agent, DateRange, Distribution, GenericMapper, Organization, Person} from "../../model/generic.mapper";
import {License} from '@shared/license.model';
import {getLogger} from "log4js";
import {UrlUtils} from "../../utils/url.utils";
import {RequestDelegate} from "../../utils/http-request.utils";
import {SparqlSummary} from "./sparql.importer";
import {OptionsWithUri} from "request-promise";
import {SparqlSettings} from './sparql.settings';
import {DcatLicensesUtils} from "../../utils/dcat.licenses.utils";
import {throwError} from "rxjs";
import {ImporterSettings} from "../../importer.settings";
import {map} from "rxjs/operators";

let xpath = require('xpath');

export class SparqlMapper extends GenericMapper {

    private log = getLogger();

    private readonly record: any;
    private readonly catalogPage: any;
    private readonly linkedDistributions: any;
    private harvestTime: any;
    private readonly issued: string;

//    protected readonly idInfo; // : SelectedValue;
    private settings: SparqlSettings;
    private readonly uuid: string;
    private summary: SparqlSummary;

    private keywordsAlreadyFetched = false;
    private fetched: any = {
        contactPoint: null,
        keywords: {},
        themes: null
    };


    constructor(settings, record, harvestTime, issued, summary) {
        super();
        this.settings = settings;
        this.record = record;
        this.harvestTime = harvestTime;
        this.issued = issued;
        this.summary = summary;

        this.uuid = record.id.value;
    }

    protected getSettings(): ImporterSettings {
        return this.settings;
    }

    getDescription() {
        if(this.record.description)
            return this.record.description.value;
        return undefined;
    }


    async getDistributions(): Promise<Distribution[]> {
        let dists = [];

        if(this.record.distribution_url){
            let dist : Distribution = {
                format: ['unbekannt'],
                accessURL: this.record.distribution_url.value
            }
            if(this.record.distribution_title){
                dist.title = this.record.distribution_title.value;
            }
            dists.push(dist);
        }

        return dists;
    }


    async getPublisher(): Promise<any[]> {
        let publishers = [];

        if (publishers.length === 0) {
            this.summary.missingPublishers++;
            return undefined;
        } else {
            return publishers;
        }
    }

    getTitle() {
        let title = this.record.title.value;
        return title && title.trim() !== '' ? title : undefined;
    }

    getAccessRights(): string[] {
        return undefined;
    }

    getCategories(): string[] {
        let subgroups = [];
        let keywords = this.getKeywords();
        if (keywords) {
            keywords.map(k => k.toLowerCase().trim())
                .filter(k => k.startsWith("mcloud_category") || k.startsWith("mcloud-kategorie"))
                .map(k => k.replace("mcloud_category_", "").replace("mcloud-kategorie-", "").replace("mcloud-kategorie ", ""))
                .forEach(k => {
                if (k === 'roads' || k === 'straßen') subgroups.push('roads');
                if (k === 'climate' || k === 'klima-und-wetter') subgroups.push('climate');
                if (k === 'waters' || k === 'wasserstraßen-und-gewässer') subgroups.push('waters');
                if (k === 'railway' || k === 'bahn') subgroups.push('railway');
                if (k === 'infrastructure' || k === 'infrastuktur') subgroups.push('infrastructure');
                if (k === 'aviation' || k === 'luft--und-raumfahrt') subgroups.push('aviation');
            });
        }
        if (subgroups.length === 0) subgroups.push(...this.settings.defaultMcloudSubgroup);
        return subgroups;
    }

    getCitation(): string {
        return undefined;
    }

    async getDisplayContacts() {
        return [];
    }

    getGeneratedId(): string {
        return this.uuid;
    }

    /**
     * Extracts and returns an array of keywords defined in the ISO-XML document.
     * This method also checks if these keywords contain at least one of the
     * given mandatory keywords. If this is not the case, then the mapped
     * document is flagged to be skipped from the index. By default this array
     * contains just one entry 'opendata' i.e. if the ISO-XML document doesn't
     * have this keyword defined, then it will be skipped from the index.
     */
    getKeywords(): string[] {
        let keywords = [];

        if(this.record.keywords){
            keywords = this.record.keywords.value.split(',').map(s => s.trim())
        }

        if(this.settings.filterTags && this.settings.filterTags.length > 0 && !keywords.some(keyword => this.settings.filterTags.includes(keyword))){
            this.skipped = true;
        }

        return keywords;
    }

    getMFundFKZ(): string {
        // Detect mFund properties
        let keywords = this.getKeywords();
        if (keywords) {
            let fkzKeyword = keywords.find(kw => kw.toLowerCase().startsWith('mfund-fkz:'));

            if (fkzKeyword) {
                let idx = fkzKeyword.indexOf(':');
                let fkz = fkzKeyword.substr(idx + 1);

                if (fkz) return fkz.trim();
            }
        }
        return undefined;
    }

    getMFundProjectTitle(): string {
        // Detect mFund properties
        let keywords = this.getKeywords();
        if (keywords) {
            let mfKeyword: string = keywords.find(kw => kw.toLowerCase().startsWith('mfund-projekt:'));

            if (mfKeyword) {
                let idx = mfKeyword.indexOf(':');
                let mfName = mfKeyword.substr(idx + 1);

                if (mfName) return mfName.trim();
            }
        }
        return undefined;
    }

    getMetadataIssued(): Date {
        return this.record.issued ? new Date(this.record.issued.value) : undefined;
    }

    getMetadataSource(): any {
        let dcatLink; //=  DcatMapper.select('.//dct:creator', this.record);
        let portalLink = this.record.source_link.value;
        return {
            raw_data_source: dcatLink,
            portal_link: portalLink,
            attribution: this.settings.defaultAttribution
        };
    }

    getModifiedDate() {
        return undefined;
    }

    getSpatial(): any {
        return undefined;
    }

    getSpatialText(): string {
        return undefined;
    }

    getTemporal(): DateRange[] {
        return undefined;
    }

    getThemes() {
        // Return cached value, if present
        if (this.fetched.themes) return this.fetched.themes;

        // Evaluate the themes
        let themes : string[];
        if(this.record.dcat_theme){
            themes = this.record.dcat_theme.value.split(',').map(s => s.replace("http://publications.europa.eu/resource/authority/data-theme/", "").trim())
        }

        this.fetched.themes = themes;
        return themes;
    }

    isRealtime(): boolean {
        return undefined;
    }

    getAccrualPeriodicity(): string {
        return undefined;
    }

    async getLicense() {
        let license: License;

        if(this.record.license) {
            license = await DcatLicensesUtils.get(this.record.license.value);
        }

        if (!license) {
            let msg = `No license detected for dataset. ${this.getErrorSuffix(this.uuid, this.getTitle())}`;
            this.summary.missingLicense++;

            this.log.warn(msg);
            this.summary.warnings.push(['Missing license', msg]);
            return {
                id: 'unknown',
                title: 'Unbekannt',
                url: undefined
            };
        }

        return license;
    }

    getErrorSuffix(uuid, title) {
        return `Id: '${uuid}', title: '${title}', source: '${this.settings.endpointUrl}'.`;
    }

    getHarvestedData(): string {
        return JSON.stringify(this.record);
    }

    getCreator(): Person[] {
        let creators = [];
        return creators.length === 0 ? undefined : creators;
    }

    getMaintainer(): Person[] {
        let maintainers = [];
        return maintainers.length === 0 ? undefined : maintainers;
    }

    getGroups(): string[] {
        return undefined;
    }

    getIssued(): Date {
        return this.record.issued ? new Date(this.record.issued.value) : undefined;
    }

    getMetadataHarvested(): Date {
        return new Date(Date.now());
    }

    getSubSections(): any[] {
        return undefined;
    }

    getOriginator(): Person[] {

        let originators = [];

        return originators.length === 0 ? undefined : originators;
    }

    async getContactPoint(): Promise<any> {
        let contactPoint = this.fetched.contactPoint;
        if (contactPoint) {
            return contactPoint;
        }
        let infos: any = {};
        this.fetched.contactPoint = infos;
        return infos;
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

    protected getUuid(): string {
        return this.uuid;
    }

    executeCustomCode(doc: any) {
        try {
            if (this.settings.customCode) {
                eval(this.settings.customCode);doc
            }
        } catch (error) {
            throwError('An error occurred in custom code: ' + error.message);
        }
    }

}

// Private interface. Do not export
interface creatorType {
    name?: string;
    mbox?: string;
}
