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

import * as MiscUtils from '../../utils/misc.utils';
import { getLogger } from 'log4js';
import { BaseMapper } from '../base.mapper';
import { Catalog } from '../../model/dcatApPlu.model';
import { Columns } from './excelsparse.importer';
import { DateRange } from '../../model/dateRange';
import { Distribution } from '../../model/distribution';
import { ExcelSparseSettings } from './excelsparse.settings';
import { ImporterSettings } from '../../importer.settings';
import { MetadataSource } from '../../model/index.document';
import { Contact, Organization, Person } from '../../model/agent';
import { RequestDelegate, RequestOptions } from '../../utils/http-request.utils';
import { Summary } from '../../model/summary';
import { UrlUtils } from '../../utils/url.utils';

export class ExcelSparseMapper extends BaseMapper {

    log = getLogger();

    data;
    id;
    columnValues: string[] | Date;
    columnMap: Columns;
    workbook;
    private settings: ExcelSparseSettings;
    private summary: Summary;
    private currentIndexName: string;
    private fetched: any = {
        description: null,
        contactPoint: null,
        keywords: {},
        nsMap: null,
        title: null,
        themes: null
    };

    constructor(settings: ExcelSparseSettings, data, generalInfo) {
        super();
        this.settings = settings;
        this.data = data;
        this.id = data.id;
        this.columnValues = data.columnValues;
        this.columnMap = data.columnMap;
        this.workbook = data.workbook;
        this.summary = data.summary;
        this.currentIndexName = data.currentIndexName;
        this.fetched = MiscUtils.merge(this.fetched, generalInfo);

        super.init();
    }

    public getSettings(): ImporterSettings {
        return this.settings;
    }

    public getSummary(): Summary{
        return this.summary;
    }

    getTitle() {
        return this.columnValues[this.columnMap.NAME];
    }

    getAlternateTitle() {
        return this.getTitle();
    }

    // TODO
    getDescription() {
        // return this.columnValues[this.columnMap.Kurzbeschreibung];
        return undefined;
    }

    // TODO
    async getPublisher(): Promise<Person[] | Organization[]> {
        // const publisherAbbreviations = this.columnValues[this.columnMap.DatenhaltendeStelle].split(',');
        // const publishers = this._getPublishers(this.workbook.getWorksheet(2), publisherAbbreviations);

        // return publishers.map(p => GenericMapper.createPublisher(p.name, p.url));
        return this.fetched.publisher;
    }

    getMaintainers() {
        return undefined;
    }

    async getContributors(): Promise<Person[] | Organization[]> {
        return undefined
    }

    // TODO
    getThemes(): string[] {

        // // see https://joinup.ec.europa.eu/release/dcat-ap-how-use-mdr-data-themes-vocabulary
        // const dcatCategoriesString: string = this.columnValues[this.columnMap.DCATKategorie];
        // if (dcatCategoriesString) {
        //     return dcatCategoriesString.split(',').map(cat => GenericMapper.DCAT_CATEGORY_URL + cat);
        // } else {
        //     return this.settings.defaultDCATCategory
        //         .map( category => GenericMapper.DCAT_CATEGORY_URL + category);
        // }
        return undefined;

    }

    // TODO
    getAccessRights() {
        // let rights = this.columnValues[this.columnMap.Nutzungshinweise];
        // return rights && rights.trim() !== '' ? [rights] : undefined;
        return undefined;
    }

    // TODO
    async getDistributions() {
        // const types = ['Dateidownload', 'WMS', 'FTP', 'AtomFeed', 'Portal', 'SOS', 'WFS', 'WCS', 'WMTS', 'API'];

        const distributions: Distribution[] = [];

        // const filteredTypes = types.filter(type => this.columnValues[this.columnMap[type]]);
        // await Promise.all(filteredTypes.map(async type => {
        //     const dist = await this.addDownloadUrls(type, this.columnValues[this.columnMap[type]]);
        //     distributions.push(...dist);
        // }));

        return distributions;
    }

    // TODO
    getModifiedDate() {
        // const datePattern = /(\d{2})\.(\d{2})\.(\d{4})/;
        // const dateMetaUpdate = this.columnValues[this.columnMap.Aktualisierungsdatum];
        // return dateMetaUpdate instanceof Date ? dateMetaUpdate : new Date(dateMetaUpdate.replace(datePattern, '$3-$2-$1'));
        return undefined;
    }

    getGeneratedId() {
        return this.data.id;
    }

    getMetadataSource(): MetadataSource {
        return {
            source_base: this.settings.filePath,
            attribution: 'mcloud-excel'
        };
    }

    // TODO
    isRealtime() {
        // return this.columnMap.Echtzeitdaten === 1;
        return undefined;
    }

    getSpatial(): object {
        return {
            'type': 'point',
            'coordinates': [parseFloat(this.columnMap.LON), parseFloat(this.columnMap.LAT)]
        };
    }

    getSpatialText(): string {
        return undefined;
    }

    getCentroid(): object {
        return this.getSpatial();
    }

    // TODO
    getTemporal(): DateRange[] {
        // let range: string = this.columnValues[this.columnMap.Zeitraum];
        // if (range) {
        //     try {
        //         if (range.includes('-')) {
        //             let splitted = range.split('-');
        //             if (splitted.length === 2) {
        //                 let dateFrom = this.parseDate(splitted[0].trim());
        //                 let dateTo = this.parseDate(splitted[1].trim());
        //                 return (dateFrom && !isNaN(dateFrom.getTime())) || (dateTo && !isNaN(dateTo.getTime())) ? [{
        //                     gte: dateFrom,
        //                     lte: dateTo
        //                 }] : [];
        //             }
        //         }

        //         let date = this.parseDate(range.trim());

        //         if (date === null || isNaN(date.getTime())) {
        //         } else {
        //             return [{
        //                 gte: date,
        //                 lte: date
        //             }];
        //         }
        //     } catch {
        //     }
        // }
        return undefined;
    }

    // TODO
    getCategories() {
        // let categories = this.mapCategories(this.columnValues[this.columnMap.Kategorie].split(','));
        // if (!categories || categories.length === 0) categories = this.settings.defaultMcloudSubgroup;
        // return categories;
        return undefined;
    }

    // TODO
    getCitation() {
        // return this.columnValues[this.columnMap.Quellenvermerk];
        return undefined;
    }

    // TODO
    async getDisplayContacts() {
        // const publisherAbbreviations = this.columnValues[this.columnMap.DatenhaltendeStelle].split(',');
        // const publishers = this._getPublishers(this.workbook.getWorksheet(2), publisherAbbreviations);

        // return publishers.map(p => <Person>{name: p.name.trim(), homepage: p.url});
        return undefined;
    }

    // TODO
    getMFundFKZ() {
        // let mfundFkz = this.columnValues[this.columnMap.mFundFoerderkennzeichen];
        // if (mfundFkz && (mfundFkz.formula || mfundFkz.sharedFormula)) {
        //     mfundFkz = mfundFkz.result;
        // }
        // return mfundFkz && mfundFkz.length > 0 ? mfundFkz : undefined;
        return undefined;
    }

    // TODO
    getMFundProjectTitle() {
        // let mfundProject = this.columnValues[this.columnMap.mFundProjekt];
        // if (mfundProject && (mfundProject.formula || mfundProject.sharedFormula)) {
        //     mfundProject = mfundProject.result;
        // }
        // return mfundProject && mfundProject.length > 0 ? mfundProject : undefined;
        return undefined;
    }


    // ************************
    // PRIVATE METHODS
    // ************************

    /**
     *
     * @param authorsSheet
     * @param abbreviations
     * @returns {Array}
     * @private
     */
    getPublishers(authorsSheet, /*string[]*/abbreviations) {
        let publishers = [];
        const numAuthors = authorsSheet.rowCount;
        abbreviations.forEach(abbr => {
            let found = false;
            for (let i = 2; i <= numAuthors; i++) {
                const row = authorsSheet.getRow(i);
                if (row.values[1] === abbr) {
                    publishers.push({
                        name: row.values[2],
                        url: row.values[4]
                    });
                    found = true;
                    break;
                }
            }
            if (!found) {
                let message = 'Could not find abbreviation of "Datenhaltende Stelle": ' + abbr;
                this.log.warn(message);
                this.summary.warnings.push(['No Publisher found', message]);
            }
        });
        return publishers;
    }

    /**
     * Split download urls and add each one to the resource.
     * @param type
     * @param urlsString
     */
    async addDownloadUrls(type: string, urlsString: string | any): Promise<Distribution[]> {
        // Check if the cell contains just text or hyperlinked text
        if (urlsString.text) urlsString = urlsString.text;
        const distributions: Distribution[] = [];

        let downloads: string[] = urlsString.split(/,[\s]+/); // comma followed by one or more (spaces, carriage returns or newlines)
        await Promise.all(downloads.map(async (downloadUrl) => {

            // skip if downloadURL is empty
            if (downloadUrl.trim().length === 0) return;

            let requestConfig = this.getUrlCheckRequestConfig(downloadUrl);
            let checkedUrl = await UrlUtils.urlWithProtocolFor(requestConfig, this.settings.skipUrlCheckOnHarvest);

            if (checkedUrl) {
                distributions.push({
                    format: [type],
                    accessURL: downloadUrl.trim()
                });
            } else {
                let msg = `Invalid URL '${downloadUrl} found for item with id: '${this.id}', title: '${this.getTitle()}', index: '${this.currentIndexName}'.`;
                this.log.warn(msg);
                this.summary.warnings.push(['Invalid URL', msg]);
                //this.errors.push(msg);
                //this.summary.numErrors++;
            }
        }));

        return distributions;
    }

    /**
     * Convert each category to a unified name.
     * @param {string[]} categories
     */
    mapCategories(categories) {
        return categories.map(cat => {
            switch (cat) {
                case 'Infrastruktur':
                    return 'infrastructure';
                case 'Bahn':
                    return 'railway';
                case 'Klima':
                    return 'climate';
                case 'Gewässer':
                    return 'waters';
                case 'Straßen':
                    return 'roads';
                case 'Luftfahrt':
                case 'Luftverkehr':
                    return 'aviation';
                case 'Data-Run':
                    return 'data-run';
            }
        });
    }

    // TODO
    async getLicense() {
        // const licenseSheet = this.workbook.getWorksheet(3);
        // const licenseId = this.columnValues[this.columnMap.Lizenz].toLowerCase();
        // const numLicenses = licenseSheet.rowCount;

        // let license: License;

        // for (let i = 2; i <= numLicenses; i++) {
        //     const row = licenseSheet.getRow(i);
        //     if (row.values[1].toLowerCase() === licenseId) {
        //         license = {
        //             id: row.values[2] === 'Keine Angabe' ? 'unknown' : row.values[3],
        //             title: row.values[2] === 'Keine Angabe' ? 'Unbekannt' : row.values[2],
        //             url: row.values[4]
        //         };
        //     }
        // }

        // if (!license) {
        //     let message = 'Could not find abbreviation of "License": ' + licenseId;
        //     log.warn(message);
        //     this.summary.warnings.push(['Invalid License', message]);
        // }

        // return license;
        return undefined;
    }

    // TODO
    getAccrualPeriodicity(): string {
        // let value: string = this.columnValues[this.columnMap.Periodizitaet].toString();
        // if(value){
        //     let periodicity = DcatPeriodicityUtils.getPeriodicity(value);
        //     if(!periodicity){
        //         this.summary.warnings.push(["Unbekannte Periodizität", value]);
        //     }
        //     return periodicity;
        // }
        return undefined;
    }

    getKeywords(): string[] {
        return undefined;
    }

    getCreator() {
        return undefined;
    }

    getHarvestedData(): string {
        return JSON.stringify(this.columnValues);
    }

    getGroups(): string[] {
        return undefined;
    }

    getIssued(): Date {
        return undefined;
    }

    getHarvestingDate(): Date {
        return undefined;
    }

    getSubSections(): any[] {
        return undefined;
    }

    getContactPoint(): Promise<Contact> {
        return this.fetched.contactPoint;
    }

    // TODO
    getOriginator(): Organization[] {
        // let originator = {
        //     organization: this.columnValues[this.columnMap.Quellenvermerk]
        // };

        // if (!originator.organization || originator.organization === 'keinen') {
        //     return undefined;
        // }

        // return [originator];
        return undefined;
    }

    private getUrlCheckRequestConfig(uri: string): RequestOptions {
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

    getBoundingBox() {
        return undefined;
    }

    async getCatalog(): Promise<Catalog> {
        return {
            description: this.fetched.description,
            title: this.fetched.title,
            publisher: await this.getPublisher()[0]
        }
    }

    getPluDevelopmentFreezePeriod() {
        return undefined;
    }

    getPluPlanState() {
        return undefined;
    }

    getPluPlanType() {
        return undefined;
    }

    getPluPlanTypeFine() {
        return undefined;
    }

    getPluProcedurePeriod() {
        return undefined;
    }

    getPluProcedureState() {
        return undefined;
    }

    getPluProcedureType() {
        return undefined;
    }

    getPluProcessSteps() {
        return undefined;
    }

    getPluNotification() {
        return undefined;
    }

    getAdmsIdentifier() {
        return undefined;
    }

    getRelation() {
        return undefined;
    }

    /**
     * Parse a string of format "dd.mm.yyyy" and convert it to a date object.
     * @param input
     */
    private parseDate(input): Date {
        let date: Date = new Date(Date.now());
        date.setHours(0,0,0,0);
        switch (input.toLowerCase()) {
            case "heute":
                return date;
            case "gestern":
                date.setDate(date.getDate()-1);
                return date;
            case "letzter monat":
                date.setDate(0);
                return date;
            case "vorletzter monat":
                date.setMonth(date.getMonth()-1, 0);
                return date;
            case "aktuelles jahr":
                return new Date(date.getFullYear(), 0, 1)
            case "letztes jahr":
                return new Date(date.getFullYear()-1, 12-1, 31)
        }

        if(input.match(/^[0-9]+$/g)){
            date.setDate(date.getDate() - input);
            return date;
        }

        if(input.match(/^([0-9]+)\.([0-9]+)\.([0-9]+)$/g)) {
            const parts = input.match(/([0-9]+)/g);
            // note parts[1]-1
            try {
                return new Date(parts[2], parts[1] - 1, parts[0]);
            } catch (e) {
                return null;
            }
        }
        return null
    }
}
