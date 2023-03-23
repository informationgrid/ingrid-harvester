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

import {OptionsWithUri} from 'request-promise';
import {License} from '@shared/license.model';
import * as moment from 'moment';
import {ImporterSettings} from "../importer.settings";
import {getLogger} from "log4js";
import {Summary} from "../model/summary";
import {Rules} from "../model/rules";
import {Contact, Organization, Person, Agent} from "../model/agent";
import {Distribution} from "../model/distribution";
import {DateRange} from "../model/dateRange";

moment.locale('de');

export abstract class BaseMapper {

    protected moment = moment;

    protected static DCAT_CATEGORY_URL = 'http://publications.europa.eu/resource/authority/data-theme/';

    protected errors: string[] = [];

    public valid = true;

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
        return this._getDescription();
    }

    abstract _getPublisher(): Promise<Person[]|Organization[]>;

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

    abstract _getDistributions(): Promise<Distribution[]>;

    async getDistributions(): Promise<Distribution[]>{
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

    abstract _getKeywords(): string[];

    getKeywords(): string[]{
        let keywords = this._getKeywords()
        if(keywords != undefined)
            return keywords.map(keyword => keyword.trim());
        return undefined;
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
        return this._getAccrualPeriodicity();
    }

    abstract _getContactPoint(): Promise<Contact>;

    async getContactPoint(): Promise<Contact>{
        return await this._getContactPoint();
    }

    abstract _getCreator(): Person[] | Person;

    getCreator(): Agent[] | Agent{
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

    isValid(doc?: any) {
        return this.valid;
    }

    shouldBeSkipped() {
        return this.skipped;
    }

    abstract _getOriginator(): Agent[];

    getOriginator(): Agent[]{
        return this._getOriginator();
    }

    abstract _getLicense(): Promise<License>;

    async getLicense(): Promise<License>{
        return await this._getLicense();
    }

    abstract _getUrlCheckRequestConfig(uri: string): OptionsWithUri;

    getUrlCheckRequestConfig(uri: string): OptionsWithUri{
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


