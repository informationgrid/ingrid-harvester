/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2021 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  http://ec.europa.eu/idabc/eupl5
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

import {OptionsWithUri} from 'request-promise';
import {License} from '@shared/license.model';
import * as moment from 'moment';
import {IndexDocument} from './index.document';
import {ImporterSettings} from "../importer.settings";
import {getLogger} from "log4js";
import {Summary} from "./summary";
import {Rules} from "./rules";

moment.locale('de');

export interface Distribution {
    format: string[];
    accessURL: string;
    id?: string;
    title?: string;
    description?: string;
    issued?: Date;
    modified?: Date;
    byteSize?: number;
}
export interface Agent {
    homepage?: string;
    mbox?: string;
}
export interface Person extends Agent {
    name: string;
}
export interface Organization extends Agent {
    organization: string;
}
export interface DateRange {
    gte?: Date,
    lte?: Date
}


export abstract class GenericMapper {

    protected moment = moment;

    protected sizeMap = {
        byte: 1,
        bytes: 1,
        kilobyte: 1000,
        kilobytes: 1000,
        kb: 1000,
        megabyte: 10000000,
        megabytes: 10000000,
        mb: 10000000,
        gigabyte: 10000000000,
        gigabytes: 10000000000,
        gb: 10000000000,
    };

    protected static DCAT_CATEGORY_URL = 'http://publications.europa.eu/resource/authority/data-theme/';

    protected errors: string[] = [];

    protected valid = true;

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

    protected abstract getSettings(): ImporterSettings;
    protected abstract getSummary(): Summary;

    abstract _getTitle(): string;

    getTitle(): string{
        return this._getTitle();
    }

    abstract _getDescription(): string;

    getDescription(): string{
        return this._getDescription();
    }

    abstract async _getPublisher(): Promise<Person[]|Organization[]>;

    async getPublisher(): Promise<Person[]|Organization[]>{
        return await this._getPublisher();
    }

    abstract _getThemes(): string[];

    getThemes(): string[]{
        return this._getThemes();
    }

    abstract _getModifiedDate(): Date;

    getModifiedDate(): Date{
        return this._getModifiedDate()
    }

    abstract _getAccessRights(): string[];

    getAccessRights(): string[]{
        return this._getAccessRights();
    }

    abstract async _getDistributions(): Promise<Distribution[]>;
    async getDistributions(): Promise<Distribution[]>{
        let distributions = await this._getDistributions();
        distributions.forEach(dist => {
            if(dist.format){
                dist.format = dist.format.filter(format => format && format.trim() !== 'null' && format.trim() !== '');
            }
            if(!dist.format || dist.format.length === 0){
                dist.format = ["Unbekannt"];
            }

            dist.accessURL = dist.accessURL.replace(/ /g, '%20');
        });

        if (distributions.length === 0) {
            this.valid = false;
            let msg = `Dataset has no links for download/access. It will not be displayed in the portal. Title: '${this.getTitle()}', Id: '${this.getGeneratedId()}'.`;

            this.getSummary().missingLinks++;

            this.valid = false;
            this.getSummary().warnings.push(['No links', msg]);

            this._log.warn(msg);
        }

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
        return distributions;
    }

    abstract _getGeneratedId(): string;

    getGeneratedId(): string{
        return this._getGeneratedId()
    }

    abstract _getMetadataModified(): Date;

    getMetadataModified(): Date{
        return this._getMetadataModified();
    }

    abstract _getMetadataSource(): any;

    getMetadataSource(): any{
        return this._getMetadataSource();
    }

    abstract _getMetadataIssued(): Date;

    getMetadataIssued(): Date{
        return this._getMetadataIssued();
    }

    abstract _isRealtime(): boolean;

    isRealtime(): boolean{
        return this._isRealtime();
    }

    abstract _getSpatial(): any;

    getSpatial(): any{
        return this._getSpatial();
    }

    abstract _getSpatialText(): string;

    getSpatialText(): string{
        return this._getSpatialText();
    }

    abstract _getTemporal(): DateRange[];

    getTemporal(): DateRange[]{
        return this._getTemporal();
    }

    _getParent(): string{
        return null;
    }

    getParent(): string{
        return this._getParent();
    }

    abstract _getCitation(): string;

    getCitation(): string{
        return this._getCitation();
    }

    abstract _getCategories(): string[];

    getCategories(): string[]{
        return this._getCategories();
    }


    _getMFundFKZ(): string {
        // Detect mFund properties
        let keywords = this.getKeywords();
        if (keywords) {
            let fkzKeyword = keywords.find(kw => kw.toLowerCase().startsWith('mfund-fkz:') || kw.toLowerCase().startsWith('mfund-fkz '));

            if (fkzKeyword) {
                let idx_colon = fkzKeyword.indexOf(':');
                let idx_blank = fkzKeyword.indexOf(' ');
                let idx = (idx_colon > -1 && idx_blank > -1)?Math.min(idx_colon, idx_blank):Math.max(idx_colon, idx_blank);

                let fkz = fkzKeyword.substr(idx + 1);

                if (fkz) return fkz.trim();
            }
        }
        return undefined;
    }

    getMFundFKZ(): string {
        return this._getMFundFKZ();
    }

    _getMFundProjectTitle(): string{
        // Detect mFund properties
        let keywords = this.getKeywords();
        if (keywords) {
            let mfKeyword: string = keywords.find(kw => kw.toLowerCase().startsWith('mfund-projekt:') || kw.toLowerCase().startsWith('mfund-projekt '));

            if (mfKeyword) {
                let idx_colon = mfKeyword.indexOf(':');
                let idx_blank = mfKeyword.indexOf(' ');
                let idx = (idx_colon > -1 && idx_blank > -1)?Math.min(idx_colon, idx_blank):Math.max(idx_colon, idx_blank);

                let mfName = mfKeyword.substr(idx + 1);

                if (mfName) return mfName.trim();
            }
        }
        return undefined;
    }

    getMFundProjectTitle(): string{
        return this._getMFundProjectTitle();
    }

    abstract async _getDisplayContacts(): Promise<Organization[] | Person[]>;

    async getDisplayContacts(): Promise<Organization[] | Person[]>{
        return await this._getDisplayContacts();
    }

    abstract _getKeywords(): string[];

    getKeywords(): string[]{
        let keywords = this._getKeywords()
        if(keywords != undefined)
            return keywords.map(keyword => keyword.trim());
        return undefined;
    }

    abstract _getAccrualPeriodicity(): string;

    getAccrualPeriodicity(): string{
        return this._getAccrualPeriodicity();
    }

    abstract async _getContactPoint(): Promise<any>;

    async getContactPoint(): Promise<any>{
        return await this._getContactPoint();
    }

    abstract _getCreator(): Person[] | Person;

    getCreator(): Person[] | Person{
        return this._getCreator();
    }

    abstract _getHarvestedData(): string;

    getHarvestedData(): string{
        return this._getHarvestedData();
    }

    getHarvestErrors() {
        return this.errors.length === 0 ? undefined : this.errors;
    }

    abstract _getIssued(): Date;

    getIssued(): Date{
        return this._getIssued();
    }

    abstract _getMetadataHarvested(): Date;

    getMetadataHarvested(): Date{
        return this._getMetadataHarvested();
    }

    abstract _getSubSections(): any[];

    getSubSections(): any[]{
        return this._getSubSections();
    }

    abstract _getGroups(): string[];

    getGroups(): string[]{
        return this._getGroups();
    }

    getExtrasAllData(): any[] {
        let all = [];

        let keywords = this.getKeywords();
        if (keywords) {
            keywords.forEach(kw => all.push(kw));
        }

        let mfundFkz = this.getMFundFKZ();
        if (mfundFkz) { // mfund_fkz exists and isn't zero (falsy)
            all.push(mfundFkz);
            all.push('mFUND'); // Add an additional keyword as aid for search
        }
        return all;
    }

    isValid(doc?: any) {
        return this.valid;
    }

    shouldBeSkipped() {
        return this.skipped;
    }

    abstract _getOriginator(): Person[]|Organization[];

    getOriginator(): Person[]|Organization[]{
        return this._getOriginator();
    }

    abstract async _getLicense(): Promise<License>;

    async getLicense(): Promise<License>{
        return await this._getLicense();
    }

    abstract _getUrlCheckRequestConfig(uri: string): OptionsWithUri;

    getUrlCheckRequestConfig(uri: string): OptionsWithUri{
        return this._getUrlCheckRequestConfig(uri);
    }


    getPriority(){
        if(this.getSettings().priority){
            return this.getSettings().priority;
        }
        return undefined;
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
        return code ? GenericMapper.DCAT_CATEGORY_URL + code : null;
    }
}


