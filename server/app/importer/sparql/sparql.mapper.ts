/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2022 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

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
import {Summary} from "../../model/summary";

let xpath = require('xpath');

export class SparqlMapper extends GenericMapper {

    private log = getLogger();

    private readonly record: any;
    private readonly catalogPage: any;
    private readonly linkedDistributions: any;
    private harvestTime: any;
    private readonly storedData: any;

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


    constructor(settings, record, harvestTime, storedData, summary) {
        super();
        this.settings = settings;
        this.record = record;
        this.harvestTime = harvestTime;
        this.storedData = storedData;
        this.summary = summary;

        this.uuid = record.id.value;

        super.init();
    }

    protected getSettings(): ImporterSettings {
        return this.settings;
    }

    protected getSummary(): Summary{
        return this.summary;
    }

    _getDescription() {
        if(this.record.description)
            return this.record.description.value;
        return undefined;
    }


    async _getDistributions(): Promise<Distribution[]> {
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


    async _getPublisher(): Promise<any[]> {
        let publishers = [];

        if (publishers.length === 0) {
            this.summary.missingPublishers++;
            return undefined;
        } else {
            return publishers;
        }
    }

    _getTitle() {
        let title = this.record.title.value;
        return title && title.trim() !== '' ? title : undefined;
    }

    _getAccessRights(): string[] {
        return undefined;
    }

    _getCategories(): string[] {
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

    _getCitation(): string {
        return undefined;
    }

    async _getDisplayContacts() {
        return [];
    }

    _getGeneratedId(): string {
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
    _getKeywords(): string[] {
        let keywords = [];

        if(this.record.keywords){
            keywords = this.record.keywords.value.split(',').map(s => s.trim()).filter(s => s.length > 0)
        }

        if(this.settings.filterTags && this.settings.filterTags.length > 0 && !keywords.some(keyword => this.settings.filterTags.includes(keyword))){
            this.skipped = true;
        }

        return keywords;
    }

    _getMetadataIssued(): Date {
        return (this.storedData && this.storedData.issued) ? new Date(this.storedData.issued) : undefined;
    }

    _getMetadataModified(): Date {
        if(this.storedData && this.storedData.modified && this.storedData.dataset_modified){
            let storedDataset_modified: Date = new Date(this.storedData.dataset_modified);
            if(storedDataset_modified.valueOf() === this.getModifiedDate().valueOf()  )
                return new Date(this.storedData.modified);
        }
        return new Date(Date.now());
    }

    _getMetadataSource(): any {
        let dcatLink; //=  DcatMapper.select('.//dct:creator', this.record);
        let portalLink = this.record.source_link.value;
        return {
            raw_data_source: dcatLink,
            portal_link: portalLink,
            attribution: this.settings.defaultAttribution
        };
    }

    _getModifiedDate() {
        return this.record.modified ? new Date(this.record.modified.value) : undefined;
    }

    _getSpatial(): any {
        return undefined;
    }

    _getSpatialText(): string {
        return undefined;
    }

    _getTemporal(): DateRange[] {
        return undefined;
    }

    _getThemes() {
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

    _isRealtime(): boolean {
        return undefined;
    }

    _getAccrualPeriodicity(): string {
        return undefined;
    }

    async _getLicense() {
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

    _getHarvestedData(): string {
        return JSON.stringify(this.record);
    }

    _getCreator(): Person[] {
        let creators = [];
        return creators.length === 0 ? undefined : creators;
    }

    _getMaintainer(): Person[] {
        let maintainers = [];
        return maintainers.length === 0 ? undefined : maintainers;
    }

    _getGroups(): string[] {
        return undefined;
    }

    _getIssued(): Date {
        return this.record.issued ? new Date(this.record.issued.value) : undefined;
    }

    _getMetadataHarvested(): Date {
        return new Date(Date.now());
    }

    _getSubSections(): any[] {
        return undefined;
    }

    _getOriginator(): Person[] {

        let originators = [];

        return originators.length === 0 ? undefined : originators;
    }

    async _getContactPoint(): Promise<any> {
        let contactPoint = this.fetched.contactPoint;
        if (contactPoint) {
            return contactPoint;
        }
        let infos: any = {};
        this.fetched.contactPoint = infos;
        return infos;
    }

    _getUrlCheckRequestConfig(uri: string): OptionsWithUri {
        let config: OptionsWithUri = {
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

    _getBoundingBoxGml() {
        return undefined;
    }

    _getBoundingBox() {
        return undefined;
    }

    _getSpatialGml() {
        return undefined;
    }

    _getCentroid() {
        return undefined;
    }

    async _getCatalog() {
        return undefined;
    }

    _getPluPlanState() {
        return undefined;
    }

    _getPluPlanType() {
        return undefined;
    }

    _getPluPlanTypeFine() {
        return undefined;
    }

    _getPluProcedureStartDate() {
        return undefined;
    }

    _getPluProcedureState() {
        return undefined;
    }

    _getPluProcedureType() {
        return undefined;
    }

    _getPluProcessSteps() {
        return undefined;
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
