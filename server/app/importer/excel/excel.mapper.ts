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

import {UrlUtils} from '../../utils/url.utils';
import {BaseMapper} from '../base.mapper';
import {Distribution} from "../../model/distribution";
import {DateRange} from "../../model/dateRange";
import {License} from '@shared/license.model';
import {Summary} from '../../model/summary';
import {ExcelSettings} from './excel.settings';
import {RequestDelegate} from '../../utils/http-request.utils';
import {OptionsWithUri} from 'request-promise';
import {ImporterSettings} from "../../importer.settings";
import {DcatPeriodicityUtils} from "../../utils/dcat.periodicity.utils";
import {Organization, Person} from "../../model/agent";

const log = require('log4js').getLogger(__filename);

export class ExcelMapper extends BaseMapper {

    data;
    id;
    storedData;
    columnValues: string[] | Date;
    columnMap;
    workbook;
    private settings: ExcelSettings;
    private summary: Summary;
    private currentIndexName: string;

    constructor(settings: ExcelSettings, data) {
        super();
        this.settings = settings;
        this.data = data;
        this.id = data.id;
        this.storedData = data.storedData;
        this.columnValues = data.columnValues;
        this.columnMap = data.columnMap;
        this.workbook = data.workbook;
        this.summary = data.summary;
        this.currentIndexName = data.currentIndexName;

        super.init();
    }

    public getSettings(): ImporterSettings {
        return this.settings;
    }

    public getSummary(): Summary{
        return this.summary;
    }

    _getTitle() {
        return this.columnValues[this.columnMap.Daten];
    }

    _getDescription() {
        return this.columnValues[this.columnMap.Kurzbeschreibung];
    }

    async _getPublisher() {
        const publisherAbbreviations = this.columnValues[this.columnMap.DatenhaltendeStelle].split(',');
        const publishers = this._getPublishers(this.workbook.getWorksheet(2), publisherAbbreviations);

        return publishers.map(p => BaseMapper.createPublisher(p.name, p.url));
    }

    _getThemes(): string[] {

        // see https://joinup.ec.europa.eu/release/dcat-ap-how-use-mdr-data-themes-vocabulary
        const dcatCategoriesString: string = this.columnValues[this.columnMap.DCATKategorie];
        if (dcatCategoriesString) {
            return dcatCategoriesString.split(',').map(cat => BaseMapper.DCAT_CATEGORY_URL + cat);
        } else {
            return this.settings.defaultDCATCategory
                .map( category => BaseMapper.DCAT_CATEGORY_URL + category);
        }

    }

    _getAccessRights() {
        let rights = this.columnValues[this.columnMap.Nutzungshinweise];
        return rights && rights.trim() !== '' ? [rights] : undefined;
    }

    async _getDistributions() {
        const types = ['Dateidownload', 'WMS', 'FTP', 'AtomFeed', 'Portal', 'SOS', 'WFS', 'WCS', 'WMTS', 'API'];

        const distributions: Distribution[] = [];

        const filteredTypes = types.filter(type => this.columnValues[this.columnMap[type]]);
        await Promise.all(filteredTypes.map(async type => {
            const dist = await this.addDownloadUrls(type, this.columnValues[this.columnMap[type]]);
            distributions.push(...dist);
        }));

        return distributions;
    }

    _getModifiedDate() {
        const datePattern = /(\d{2})\.(\d{2})\.(\d{4})/;
        const dateMetaUpdate = this.columnValues[this.columnMap.Aktualisierungsdatum];
        return dateMetaUpdate instanceof Date ? dateMetaUpdate : new Date(dateMetaUpdate.replace(datePattern, '$3-$2-$1'));
    }

    _getGeneratedId() {
        return this.data.id;
    }

    _getMetadataIssued() {
        return (this.storedData && this.storedData.issued) ? this.storedData.issued : new Date(Date.now());
    }

    _getMetadataModified(): Date {
        if(this.storedData && this.storedData.modified && this.storedData.dataset_modified){
            let storedDataset_modified: Date = new Date(this.storedData.dataset_modified);
            if(storedDataset_modified.valueOf() === this.getModifiedDate().valueOf()  )
                return new Date(this.storedData.modified);
        }
        return new Date(Date.now());
    }

    _getMetadataSource() {
        return BaseMapper.createSourceAttribution('mcloud-excel');
    }

    _isRealtime() {
        return this.columnMap.Echtzeitdaten === 1;
    }

    _getSpatial(): any {
        return undefined;
    }

    _getSpatialText(): string {
        return undefined;
    }

    _getTemporal(): DateRange[] {
        let range: string = this.columnValues[this.columnMap.Zeitraum];
        if (range) {
            try {
                if (range.includes('-')) {
                    let splitted = range.split('-');
                    if (splitted.length === 2) {
                        let dateFrom = this.parseDate(splitted[0].trim());
                        let dateTo = this.parseDate(splitted[1].trim());
                        return (dateFrom && !isNaN(dateFrom.getTime())) || (dateTo && !isNaN(dateTo.getTime())) ? [{
                            gte: dateFrom,
                            lte: dateTo
                        }] : [];
                    }
                }

                let date = this.parseDate(range.trim());

                if (date === null || isNaN(date.getTime())) {
                } else {
                    return [{
                        gte: date,
                        lte: date
                    }];
                }
            } catch {
            }
        }
    }

    _getCategories() {
        let categories = this.mapCategories(this.columnValues[this.columnMap.Kategorie].split(','));
        if (!categories || categories.length === 0) categories = this.settings.defaultMcloudSubgroup;
        return categories;
    }

    _getCitation() {
        return this.columnValues[this.columnMap.Quellenvermerk];
    }

    async _getDisplayContacts() {
        const publisherAbbreviations = this.columnValues[this.columnMap.DatenhaltendeStelle].split(',');
        const publishers = this._getPublishers(this.workbook.getWorksheet(2), publisherAbbreviations);

        return publishers.map(p => <Person>{name: p.name.trim(), homepage: p.url});
    }

    _getMFundFKZ() {
        let mfundFkz = this.columnValues[this.columnMap.mFundFoerderkennzeichen];
        if (mfundFkz && (mfundFkz.formula || mfundFkz.sharedFormula)) {
            mfundFkz = mfundFkz.result;
        }
        return mfundFkz && mfundFkz.length > 0 ? mfundFkz : undefined;
    }

    _getMFundProjectTitle() {
        let mfundProject = this.columnValues[this.columnMap.mFundProjekt];
        if (mfundProject && (mfundProject.formula || mfundProject.sharedFormula)) {
            mfundProject = mfundProject.result;
        }
        return mfundProject && mfundProject.length > 0 ? mfundProject : undefined;
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
    _getPublishers(authorsSheet, /*string[]*/abbreviations) {
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
                log.warn(message);
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
                log.warn(msg);
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

    async _getLicense() {
        const licenseSheet = this.workbook.getWorksheet(3);
        const licenseId = this.columnValues[this.columnMap.Lizenz].toLowerCase();
        const numLicenses = licenseSheet.rowCount;

        let license: License;

        for (let i = 2; i <= numLicenses; i++) {
            const row = licenseSheet.getRow(i);
            if (row.values[1].toLowerCase() === licenseId) {
                license = {
                    id: row.values[2] === 'Keine Angabe' ? 'unknown' : row.values[3],
                    title: row.values[2] === 'Keine Angabe' ? 'Unbekannt' : row.values[2],
                    url: row.values[4]
                };
            }
        }

        if (!license) {
            let message = 'Could not find abbreviation of "License": ' + licenseId;
            log.warn(message);
            this.summary.warnings.push(['Invalid License', message]);
        }

        return license;
    }

    _getAccrualPeriodicity(): string {
        let value: string = this.columnValues[this.columnMap.Periodizitaet].toString();
        if(value){
            let periodicity = DcatPeriodicityUtils.getPeriodicity(value);
            if(!periodicity){
                this.summary.warnings.push(["Unbekannte Periodizität", value]);
            }
            return periodicity;
        }
        return undefined;
    }

    _getKeywords(): string[] {
        return undefined;
    }

    _getCreator() {
        return undefined;
    }

    _getHarvestedData(): string {
        return JSON.stringify(this.columnValues);
    }

    _getGroups(): string[] {
        return undefined;
    }

    _getIssued(): Date {
        return undefined;
    }

    _getMetadataHarvested(): Date {
        return undefined;
    }

    _getSubSections(): any[] {
        return undefined;
    }

    _getContactPoint(): Promise<any> {
        return undefined; //of(null).pipe(delay(1000)).toPromise();
    }

    _getOriginator(): Organization[] {
        let originator = {
            organization: this.columnValues[this.columnMap.Quellenvermerk]
        };

        if (!originator.organization || originator.organization === 'keinen') {
            return undefined;
        }

        return [originator];

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
