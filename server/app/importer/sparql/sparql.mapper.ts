/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2024 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or - as soon they will be
 * approved by the European Commission - subsequent versions of the
 * EUPL (the "Licence");
 *
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the Licence is distributed on an "AS IS" basis,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and
 * limitations under the Licence.
 * ==================================================
 */

/**
 * A mapper for ISO-XML documents harvested over CSW.
 */
import log4js from 'log4js';
import { throwError } from 'rxjs';
import { BaseMapper } from '../base.mapper.js';
import type { DateRange } from '../../model/dateRange.js';
import { DcatLicensesUtils } from '../../utils/dcat.licenses.utils.js';
import type { Distribution } from '../../model/distribution.js';
import type { ImporterSettings } from '../../importer.settings.js';
import type { License } from '@shared/license.model.js';
import type { MetadataSource } from '../../model/index.document.js';
import type { Person } from '../../model/agent.js';
import type { RequestOptions } from '../../utils/http-request.utils.js';
import { RequestDelegate } from '../../utils/http-request.utils.js';
import type { SparqlSettings } from './sparql.settings.js';
import type { Summary } from '../../model/summary.js';

export class SparqlMapper extends BaseMapper {

    log = log4js.getLogger();

    private readonly record: any;
    private readonly catalogPage: any;
    private readonly linkedDistributions: any;
    private harvestTime: any;

//    protected readonly idInfo; // : SelectedValue;
    private settings: SparqlSettings;
    private readonly uuid: string;
    private summary: Summary;

    private keywordsAlreadyFetched = false;
    private fetched: any = {
        contactPoint: null,
        keywords: {},
        themes: null
    };


    constructor(settings, record, harvestTime, summary) {
        super();
        this.settings = settings;
        this.record = record;
        this.harvestTime = harvestTime;
        this.summary = summary;

        this.uuid = record.id.value;

        super.init();
    }

    public getSettings(): ImporterSettings {
        return this.settings;
    }

    public getSummary(): Summary{
        return this.summary;
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
            keywords = this.record.keywords.value.split(',').map(s => s.trim()).filter(s => s.length > 0)
        }

        if(this.settings.filterTags && this.settings.filterTags.length > 0 && !keywords.some(keyword => this.settings.filterTags.includes(keyword))){
            this.skipped = true;
        }

        return keywords;
    }

    getMetadataSource(): MetadataSource {
        let dcatLink; //=  DcatMapper.select('.//dct:creator', this.record);
        let portalLink = this.record.source_link.value;
        return {
            source_base: this.settings.sourceURL,
            raw_data_source: dcatLink,
            source_type: 'sparql',
            portal_link: portalLink,
            attribution: this.settings.defaultAttribution
        };
    }

    getModifiedDate() {
        return this.record.modified ? new Date(this.record.modified.value) : undefined;
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
        return `Id: '${uuid}', title: '${title}', source: '${this.settings.sourceURL}'.`;
    }

    getHarvestedData(): string {
        return JSON.stringify(this.record);
    }

    getCreator(): Person[] {
        return undefined;
    }

    getMaintainer(): Person[] {
        return undefined;
    }

    getGroups(): string[] {
        return undefined;
    }

    getIssued(): Date {
        return this.record.issued ? new Date(this.record.issued.value) : undefined;
    }

    getHarvestingDate(): Date {
        return new Date(Date.now());
    }

    getSubSections(): any[] {
        return undefined;
    }

    getOriginator(): Person[] {
        return undefined;
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

    getUrlCheckRequestConfig(uri: string): RequestOptions {
        let config: RequestOptions = {
            method: 'HEAD',
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
