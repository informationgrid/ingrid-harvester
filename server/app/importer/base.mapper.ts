/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
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

import 'dayjs/locale/de';
import {License} from '@shared/license.model';
import {ImporterSettings} from "../importer.settings";
import {getLogger} from "log4js";
import {Summary} from "../model/summary";
import {Rules} from "../model/rules";
import {Contact, Organization, Person, Agent} from "../model/agent";
import {Distribution} from "../model/distribution";
import {DateRange} from "../model/dateRange";
import { RequestOptions } from '../utils/http-request.utils';

const dayjs = require('dayjs');
dayjs.locale('de');

export abstract class BaseMapper {

    private cache: any = {};

    protected dayjs = dayjs;

    protected static DCAT_CATEGORY_URL = 'http://publications.europa.eu/resource/authority/data-theme/';

    protected errors: string[] = [];

    public valid = true;

    private invalidationReasons = [];

    public skipped = false;

    private _log = getLogger();

    private blacklistedFormats: string[] = [];

    init() {
        let hasDataDownloadRule = this.getSettings() && this.getSettings().rules
            && this.getSettings().rules.containsDocumentsWithData
            && this.getSettings().rules.containsDocumentsWithDataBlacklist;

        if (hasDataDownloadRule) {
            this.blacklistedFormats = this.getSettings().rules.containsDocumentsWithDataBlacklist
                .split(',')
                .map(item => item.trim());
        }
    }

    public abstract getSettings(): ImporterSettings;
    public abstract getSummary(): Summary;

    abstract _getTitle(): string;

    getTitle(): string{
        return this._getTitle();
    }

    abstract _getDescription(): string;

    getDescription(): string{
        if (!this.cache.description) {
            this.cache.description = this._getDescription();
        }
        return this.cache.description;
    }

    abstract _getPublisher(): Promise<Person[]|Organization[]>;

    async getPublisher(): Promise<Person[]|Organization[]>{
        if (!this.cache.publisher) {
            this.cache.publisher = await this._getPublisher();
        }
        return this.cache.publisher;
    }

    abstract _getThemes(): string[];

    getThemes(): string[]{
        if (!this.cache.themes) {
            this.cache.themes = this._getThemes();
        }
        return this.cache.themes;
    }

    abstract _getModifiedDate(): Date;

    getModifiedDate(): Date{
        if (!this.cache.modifiedDate) {
            this.cache.modifiedDate = this._getModifiedDate();
        }
        return this.cache.modifiedDate;
    }

    abstract _getAccessRights(): string[];

    getAccessRights(): string[]{
        if (!this.cache.accessRights) {
            this.cache.accessRights = this._getAccessRights();
        }
        return this.cache.accessRights;
    }

    abstract _getDistributions(): Promise<Distribution[]>;

    async getDistributions(): Promise<Distribution[]>{
        if (this.cache.distributions) {
            return this.cache.distributions;
        }

        let distributions = await this._getDistributions();
        distributions.forEach(dist => {
            if(dist.format){
                dist.format = dist.format.filter(format => format && format.trim() !== 'null' && format.trim() !== '');
            }
            if(!dist.format || dist.format.length === 0){
                dist.format = ["Unbekannt"];
            }

            dist.accessURL = dist.accessURL?.replace(/ /g, '%20');
        });

        // if (distributions.length === 0) {
        //     this.valid = false;
        //     let msg = `Dataset has no links for download/access. It will not be displayed in the portal. Title: '${this.getTitle()}', Id: '${this.getGeneratedId()}'.`;

        //     this.getSummary().missingLinks++;

        //     this.valid = false;
        //     this.getSummary().warnings.push(['No links', msg]);

        //     this._log.warn(msg);
        // }

        const isWhitelisted = this.getSettings().whitelistedIds.indexOf(this.getGeneratedId()) !== -1;

        if (this.blacklistedFormats.length > 0) {

            if (isWhitelisted) {
                this._log.info(`Document is whitelisted and not checked: ${this.getGeneratedId()}`);
            } else {
                const result = Rules.containsDocumentsWithData(distributions, this.blacklistedFormats);
                if (result.skipped) {
                    this.getSummary().warnings.push(['No data document', `${this.getTitle()} (${this.getGeneratedId()})`]);
                    this.skipped = true;
                }
                if (!result.valid) {
                    this._log.warn(`Document does not contain data links: ${this.getGeneratedId()}`);
                    this.valid = false;
                }
            }
        }
        this.cache.distributions = distributions;
        return distributions;
    }

    abstract _getGeneratedId(): string;

    getGeneratedId(): string{
        if (!this.cache.generatedId) {
            this.cache.generatedId = this._getGeneratedId();
        }
        return this.cache.generatedId;
    }

    abstract _getMetadataModified(): Date;

    getMetadataModified(): Date{
        if (!this.cache.metadataModified) {
            this.cache.metadataModified = this._getMetadataModified();
        }
        return this.cache.metadataModified;
    }

    abstract _getMetadataSource(): any;

    getMetadataSource(): any{
        if (!this.cache.metadataSource) {
            this.cache.metadataSource = this._getMetadataSource();
        }
        return this.cache.metadataSource;
    }

    abstract _getMetadataIssued(): Date;

    getMetadataIssued(): Date{
        if (!this.cache.metadataIssued) {
            this.cache.metadataIssued = this._getMetadataIssued();
        }
        return this.cache.metadataIssued;
    }

    abstract _isRealtime(): boolean;

    isRealtime(): boolean{
        if (!this.cache.isRealtime) {
            this.cache.isRealtime = this._isRealtime();
        }
        return this.cache.isRealtime;
    }

    abstract _getSpatial(): any;

    getSpatial(): any{
        if (!this.cache.spatial) {
            this.cache.spatial = this._getSpatial();
        }
        return this.cache.spatial;
    }

    abstract _getSpatialText(): string;

    getSpatialText(): string{
        if (!this.cache.spatialText) {
            this.cache.spatialText = this._getSpatialText();
        }
        return this.cache.spatialText;
    }

    abstract _getTemporal(): DateRange[];

    getTemporal(): DateRange[]{
        if (!this.cache.temporal) {
            this.cache.temporal = this._getTemporal();
        }
        return this.cache.temporal;
    }

    _getParent(): string{
        return null;
    }

    getParent(): string{
        if (!this.cache.parent) {
            this.cache.parent = this._getParent();
        }
        return this.cache.parent;
    }

    abstract _getCitation(): string;

    getCitation(): string{
        if (!this.cache.citation) {
            this.cache.citation = this._getCitation();
        }
        return this.cache.citation;
    }

    abstract _getKeywords(): string[];

    getKeywords(): string[]{
        if (!this.cache.keywords) {
            this.cache.keywords = this._getKeywords()?.map(keyword => keyword.trim());
        }
        return this.cache.keywords;
    }

    getAutoCompletion(): string[]{
        let title = this.getTitle();
        let parts = title.split(/[^a-zA-Z0-9\u00E4\u00F6\u00FC\u00C4\u00D6\u00DC\u00df]/).filter(s => s.length >= 3).filter(s => s.match(/[a-zA-Z]/));

        let keywords = this.getKeywords()
        if(keywords != undefined)
            parts = parts.concat(keywords.filter(s => s.length >= 3));

        return parts;
    }

    abstract _getAccrualPeriodicity(): string;

    getAccrualPeriodicity(): string{
        if (!this.cache.accrualPeriod) {
            this.cache.accrualPeriod = this._getAccrualPeriodicity();
        }
        return this.cache.accrualPeriod;
    }

    abstract _getContactPoint(): Promise<Contact>;

    async getContactPoint(): Promise<Contact>{
        if (!this.cache.contactPoint) {
            this.cache.contactPoint = await this._getContactPoint();
        }
        return this.cache.contactPoint;
    }

    abstract _getCreator(): Person[] | Person;

    getCreator(): Agent[] | Agent{
        if (!this.cache.creator) {
            this.cache.creator = this._getCreator();
        }
        return this.cache.creator;
    }

    _getMaintainers(): Promise<Person[] | Organization[]> {
        return undefined;
    }

    async getMaintainers(): Promise<Person[] | Organization[]> {
        if (!this.cache.maintainers) {
            this.cache.maintainers = await this._getMaintainers();
        }
        return this.cache.maintainers;
    }

    abstract _getHarvestedData(): string;

    getHarvestedData(): string{
        if (!this.cache.harvestedData) {
            this.cache.harvestedData = this._getHarvestedData();
        }
        return this.cache.harvestedData;
    }

    getHarvestErrors() {
        return this.errors.length === 0 ? undefined : this.errors;
    }

    abstract _getIssued(): Date;

    getIssued(): Date{
        if (!this.cache.issued) {
            this.cache.issued = this._getIssued();
        }
        return this.cache.issued;
    }

    abstract _getMetadataHarvested(): Date;

    getMetadataHarvested(): Date{
        if (!this.cache.metadataHarvested) {
            this.cache.metadataHarvested = this._getMetadataHarvested();
        }
        return this.cache.metadataHarvested;
    }

    abstract _getSubSections(): any[];

    getSubSections(): any[]{
        if (!this.cache.subSections) {
            this.cache.subSections = this._getSubSections();
        }
        return this.cache.subSections;
    }

    abstract _getGroups(): string[];

    getGroups(): string[]{
        if (!this.cache.groups) {
            this.cache.groups = this._getGroups();
        }
        return this.cache.groups;
    }

    isValid(doc?: any) {
        return this.valid;
    }

    getInvalidationReasons(): string[] {
        return this.invalidationReasons;
    }

    addInvalidationReason(reason: string): void {
        if (!this.invalidationReasons.includes(reason)) {
            this.invalidationReasons.push(reason);
        }
    }

    shouldBeSkipped() {
        return this.skipped;
    }

    abstract _getOriginator(): Agent[];

    getOriginator(): Agent[]{
        if (!this.cache.originator) {
            this.cache.originator = this._getOriginator();
        }
        return this.cache.originator;
    }

    abstract _getLicense(): Promise<License>;

    async getLicense(): Promise<License>{
        if (!this.cache.license) {
            this.cache.license = await this._getLicense();
        }
        return this.cache.license;
    }

    abstract _getUrlCheckRequestConfig(uri: string): RequestOptions;

    getUrlCheckRequestConfig(uri: string): RequestOptions{
        return this._getUrlCheckRequestConfig(uri);
    }

    executeCustomCode(doc: any) {

    }


    // HELPER METHODS

    static createPublisher(name, url) {
        return {
            organization: name,
            homepage: url
        };
    }

    static createSourceAttribution(name) {
        return {
            attribution: name
        };
    }

    static DCAT_THEMES = ['AGRI', 'ECON', 'EDUC','ENER','ENVI','GOVE','HEAL','INTR','JUST','REGI','SOCI','TECH','TRAN'];

    // TODO: refactor into a mapping file
    static dcatThemeUriFromKeyword(keyword: string): string {
        // Check falsy values first
        if (!keyword) return null;

        let code: string = null;
        keyword = keyword.trim();

        switch(keyword) {
            case 'Landwirtschaft, Fischerei, Forstwirtschaft und Nahrungsmittel':
                code = 'AGRI';
                break;

            case 'Wirtschaft und Finanzen':
                code = 'ECON';
                break;

            case 'Bildung, Kultur und Sport':
                code = 'EDUC';
                break;

            case 'Energie':
                code = 'ENER';
                break;

            case 'Umwelt':
                code = 'ENVI';
                break;

            case 'Regierung und öffentlicher Sektor':
                code = 'GOVE';
                break;

            case 'Gesundheit':
                code = 'HEAL';
                break;

            case 'Internationale Themen':
                code = 'INTR';
                break;

            case 'Justiz, Rechtssystem und öffentliche Sicherheit':
                code = 'JUST';
                break;

            case 'Regionen und Städte':
                code = 'REGI';
                break;

            case 'Bevölkerung und Gesellschaft':
                code = 'SOCI';
                break;

            case 'Wissenschaft und Technologie':
                code = 'TECH';
                break;

            case 'Verkehr':
                code = 'TRAN';
                break;

            default:
                return null;
        }
        return code ? BaseMapper.DCAT_CATEGORY_URL + code : null;
    }
}


