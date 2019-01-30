import {UrlUtils} from "../utils/url-utils";
import {Distribution, GenericMapper} from "../model/generic-mapper";
import {Summary} from "../model/summary";

const log = require('log4js').getLogger(__filename);

export class ExcelMapper extends GenericMapper {

    data;
    id;
    issuedExisting;
    columnValues: string[] | Date;
    columnMap;
    workbook;
    private settings: any;
    private summary: Summary;

    constructor(settings, data) {
        super();
        this.settings = settings;
        this.data = data;
        this.id = data.id;
        this.issuedExisting = data.issued;
        this.columnValues = data.columnValues;
        this.columnMap = data.columnMap;
        this.workbook = data.workbook;
        this.summary = data.summary;
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

        return publishers.map( p => GenericMapper.createPublisher(p.name, p.url));
    }

    getThemes() {
        return ['http://publications.europa.eu/resource/authority/data-theme/TRAN']; // see https://joinup.ec.europa.eu/release/dcat-ap-how-use-mdr-data-themes-vocabulary
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
            let msg = `Item will not be displayed in portal because no valid URLs were detected. Id: '${this.id}', index: '${this.settings.currentIndexName}'.`;
            log.warn(msg);
        }

        return distributions;
    }

    getLicenseId() {
        const license = this.getLicense(this.workbook.getWorksheet(3), this.columnValues[this.columnMap.Lizenz]);
        return license.description;
    }

    getLicenseURL() {
        const license = this.getLicense(this.workbook.getWorksheet(3), this.columnValues[this.columnMap.Lizenz]);
        return license.link;
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

    getTemporal() {
        return this.columnValues[this.columnMap.Zeitraum];
    }

    getCategories() {
        return this.mapCategories(this.columnValues[this.columnMap.Kategorie].split(','));
    }

    getCitation() {
        return this.columnValues[this.columnMap.Quellenvermerk];
    }

    async getDisplayContacts() {
        const publisherAbbreviations = this.columnValues[this.columnMap.DatenhaltendeStelle].split(',');
        const publishers = this._getPublishers(this.workbook.getWorksheet(2), publisherAbbreviations);

        return publishers.map( p => GenericMapper.createDisplayContact(p.name, p.url));
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
                log.warn('Could not find abbreviation of "Datenhaltende Stelle": ' + abbr);
            }
        });
        return publishers;
    }

    /**
     * Split download urls and add each one to the resource.
     * @param type
     * @param urlsString
     * @param dataFormats
     */
    async addDownloadUrls(type: string, urlsString): Promise<Distribution[]> {
        // Check if the cell contains just text or hyperlinked text
        if (urlsString.text) urlsString = urlsString.text;
        const distributions: Distribution[] = [];

        let downloads: string[] = urlsString.split(/,[\r\n]+/); // comma followed by one or more (carriage returns or newlines)
        await Promise.all(downloads.map( async (downloadUrl) => {

            // skip if downloadURL is empty
            if (downloadUrl.trim().length === 0) return;

            let checkedUrl = await UrlUtils.urlWithProtocolFor(downloadUrl);

            if (checkedUrl) {
                distributions.push({
                    format: type,
                    accessURL: downloadUrl.trim()
                });
            } else {
                let msg = `Invalid URL '${downloadUrl} found for item with id: '${this.id}', title: '${this.getTitle()}', index: '${this.settings.currentIndexName}'.`;
                log.warn(msg);
                this.errors.push(msg);
                this.summary.numErrors++;
            }
        }));

        return distributions;
    }

    /**
     * Convert each category to a unified name.
     * @param {string[]} categories
     */
    mapCategories(categories) {
        return categories.map( cat => {
            switch (cat) {
            case 'Infrastruktur': return 'infrastructure';
            case 'Bahn': return 'railway';
            case 'Klima': return 'climate';
            case 'Gewässer': return 'waters';
            case 'Straßen': return 'roads';
            case 'Luftfahrt':
            case 'Luftverkehr': return 'aviation';
            case 'Data-Run': return 'data-run';
            }
        });
    }

    getLicense(licenseSheet, /*string*/licenseId) {
        licenseId = licenseId.toLowerCase();
        const numLicenses = licenseSheet.rowCount;

        for (let i=2; i<=numLicenses; i++) {
            const row = licenseSheet.getRow(i);
            if (row.values[1].toLowerCase() === licenseId) {
                return GenericMapper.createLicense(row.values[2], row.values[3], row.values[4]);
            }
        }

        log.warn('Could not find abbreviation of "License": ' + licenseId);
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

    getLicenseTitle(): string {
        return undefined;
    }

    getTemporalEnd(): Date {
        return undefined;
    }

    getTemporalStart(): Date {
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

    getContactPoint(): any {
        return undefined;
    }

}
