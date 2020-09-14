import {UrlUtils} from '../../utils/url.utils';
import {DateRange, Distribution, GenericMapper, Organization, Person} from '../../model/generic.mapper';
import {License} from '@shared/license.model';
import {Summary} from '../../model/summary';
import {ExcelSettings} from './excel.settings';
import {RequestDelegate} from '../../utils/http-request.utils';
import {OptionsWithUri} from 'request-promise';
import {ImporterSettings} from "../../importer.settings";

const log = require('log4js').getLogger(__filename);

export class ExcelMapper extends GenericMapper {

    data;
    id;
    issuedExisting;
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
        this.issuedExisting = data.issued;
        this.columnValues = data.columnValues;
        this.columnMap = data.columnMap;
        this.workbook = data.workbook;
        this.summary = data.summary;
        this.currentIndexName = data.currentIndexName;
    }

    protected getSettings(): ImporterSettings {
        return this.settings;
    }

    getTitle() {
        return this.columnValues[this.columnMap.Daten];
    }

    getDescription() {
        return this.columnValues[this.columnMap.Kurzbeschreibung];
    }

    async getPublisher() {
        const publisherAbbreviations = this.columnValues[this.columnMap.DatenhaltendeStelle].split(',');
        const publishers = this._getPublishers(this.workbook.getWorksheet(2), publisherAbbreviations);

        return publishers.map(p => GenericMapper.createPublisher(p.name, p.url));
    }

    getThemes(): string[] {

        // see https://joinup.ec.europa.eu/release/dcat-ap-how-use-mdr-data-themes-vocabulary
        const dcatCategoriesString: string = this.columnValues[this.columnMap.DCATKategorie];
        if (dcatCategoriesString) {
            return dcatCategoriesString.split(',').map(cat => GenericMapper.DCAT_CATEGORY_URL + cat);
        } else {
            return this.settings.defaultDCATCategory
                .map( category => GenericMapper.DCAT_CATEGORY_URL + category);
        }

    }

    getAccessRights() {
        let rights = this.columnValues[this.columnMap.Nutzungshinweise];
        return rights && rights.trim() !== '' ? [rights] : undefined;
    }

    async getDistributions() {
        const types = ['Dateidownload', 'WMS', 'FTP', 'AtomFeed', 'Portal', 'SOS', 'WFS', 'WCS', 'WMTS', 'API'];

        const distributions: Distribution[] = [];

        const filteredTypes = types.filter(type => this.columnValues[this.columnMap[type]]);
        await Promise.all(filteredTypes.map(async type => {
            const dist = await this.addDownloadUrls(type, this.columnValues[this.columnMap[type]]);
            distributions.push(...dist);
        }));

        if (distributions.length === 0) {
            this.valid = false;
            let msg = `Item will not be displayed in portal because no valid URLs were detected. Id: '${this.id}', index: '${this.currentIndexName}'.`;
            log.warn(msg);
            this.summary.warnings.push(['Invalid URLs', msg]);
        }

        return distributions;
    }

    getModifiedDate() {
        const datePattern = /(\d{2})\.(\d{2})\.(\d{4})/;
        const dateMetaUpdate = this.columnValues[this.columnMap.Aktualisierungsdatum];
        return dateMetaUpdate instanceof Date ? dateMetaUpdate : new Date(dateMetaUpdate.replace(datePattern, '$3-$2-$1'));
    }

    getGeneratedId() {
        return this.data.id;
    }

    getMetadataIssued() {
        return this.issuedExisting ? this.issuedExisting : new Date(Date.now());
    }

    getMetadataSource() {
        return GenericMapper.createSourceAttribution('mcloud-excel');
    }

    isRealtime() {
        return this.columnMap.Echtzeitdaten === 1;
    }

    getSpatial(): any {
        return undefined;
    }

    getSpatialText(): string {
        return undefined;
    }

    getTemporal(): DateRange[] {
        let range: string = this.columnValues[this.columnMap.Zeitraum];
        if (range) {
            try {
                if (range.includes('-')) {
                    let splitted = range.split('-');
                    if (splitted.length === 2) {
                        let dateFrom = this.parseDate(splitted[0].trim());
                        let dateTo = this.parseDate(splitted[1].trim());
                        return dateFrom && dateTo && !isNaN(dateFrom.getTime()) && !isNaN(dateTo.getTime()) ? [{
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

    getCategories() {
        let categories = this.mapCategories(this.columnValues[this.columnMap.Kategorie].split(','));
        if (!categories || categories.length === 0) categories = this.settings.defaultMcloudSubgroup;
        return categories;
    }

    getCitation() {
        return this.columnValues[this.columnMap.Quellenvermerk];
    }

    async getDisplayContacts() {
        const publisherAbbreviations = this.columnValues[this.columnMap.DatenhaltendeStelle].split(',');
        const publishers = this._getPublishers(this.workbook.getWorksheet(2), publisherAbbreviations);

        return publishers.map(p => <Person>{name: p.name.trim(), homepage: p.url});
    }

    getMFundFKZ() {
        let mfundFkz = this.columnValues[this.columnMap.mFundFoerderkennzeichen];
        if (mfundFkz && (mfundFkz.formula || mfundFkz.sharedFormula)) {
            mfundFkz = mfundFkz.result;
        }
        return mfundFkz && mfundFkz.length > 0 ? mfundFkz : undefined;
    }

    getMFundProjectTitle() {
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
            let checkedUrl = await UrlUtils.urlWithProtocolFor(requestConfig);

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

    async getLicense() {
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

    getAccrualPeriodicity(): string {
        return undefined;
    }

    getKeywords(): string[] {
        return undefined;
    }

    getCreator() {
        return undefined;
    }

    getHarvestedData(): string {
        return undefined;
    }

    getGroups(): string[] {
        return undefined;
    }

    getIssued(): Date {
        return undefined;
    }

    getMetadataHarvested(): Date {
        return undefined;
    }

    getSubSections(): any[] {
        return undefined;
    }

    getContactPoint(): Promise<any> {
        return undefined; //of(null).pipe(delay(1000)).toPromise();
    }

    getOriginator(): Organization[] {
        let originator = {
            organization: this.columnValues[this.columnMap.Quellenvermerk]
        };

        if (!originator.organization || originator.organization === 'keinen') {
            return undefined;
        }

        return [originator];

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
