'use strict';
//const GenericMapper = require('../model/GenericMapper');
const log = require('log4js').getLogger(__filename),
    UrlUtils = require('./../url-utils');

class GenericMapper {

    /**
     * @abstract
     */
    getTitle() {
    }

    /**
     * @abstract
     */
    getDescription() {
    }

    /**
     * @abstract
     */
    getPublisher() {
    }

    /**
     * @abstract
     */
    getThemes() {
    }

    /**
     * @abstract
     */
    getModifiedDate() {
    }

    /**
     * @abstract
     */
    getAccessRights() {
    }

    /**
     * @abstract
     */
    async getDistributions() {
    }

    /**
     * @abstract
     */
    getLicenseId() {
    }

    /**
     * @abstract
     */
    getLicenseURL() {
    }

    /**
     * @abstract
     */
    getGeneratedId() {
    }

    getMetadataModified() {
        return new Date(Date.now());
    }

    /**
     * @abstract
     */
    getMetadataSource() {}

    /**
     * @abstract
     */
    getMetadataIssued() {
    }

    /**
     * @abstract
     */
    isRealtime() {
    }

    /**
     * @abstract
     */
    getTemporal() {}

    /**
     * @abstract
     */
    getCitation() {}

    /**
     * @abstract
     */
    getCategories() {}

    /**
     * @abstract
     */
    getMFundFKZ() {}

    /**
     * @abstract
     */
    getMFundProjectTitle() {}

    /**
     * @abstract
     */
    getDisplayContacts() {}

    createPublisher(name, url) {
        return {
            organization: name,
            homepage: url
        };
    }

    createDisplayContact(name, url) {
        return {
            name: name,
            url: url
        };
    }

    createSourceAttribution(name) {
        return {
            attribution: name
        };
    }
    
    createLicense(description, abbreviation, link) {
        return {
            description: description,
            abbreviation: abbreviation,
            link: link
        };
    }

}

module.exports = GenericMapper;

/**
 *
 * @type {module.ExcelMapper}
 * // @extends GenericMapper
 */
module.exports = class ExcelMapper extends GenericMapper {

    constructor(data) {
        super();
        this.data = data;
        this.id = data.id;
        this.issuedExisting = data.issued;
        this.columnValues = data.columnValues;
        this.columnMap = data.columnMap;
        this.workbook = data.workbook;
    }

    getTitle() {
        return this.columnValues[this.columnMap.Daten];
    }

    getDescription() {
        return this.columnValues[this.columnMap.Kurzbeschreibung];
    }

    getPublisher() {
        const publisherAbbreviations = this.columnValues[this.columnMap.DatenhaltendeStelle].split(',');
        const publishers = this._getPublishers(this.data.workbook.getWorksheet(2), publisherAbbreviations);

        return publishers.map( p => this.createPublisher(p.name, p.url));
    }

    getThemes() {
        return ['http://publications.europa.eu/resource/authority/data-theme/TRAN']; // see https://joinup.ec.europa.eu/release/dcat-ap-how-use-mdr-data-themes-vocabulary
    }

    getAccessRights() {
        return [this.columnValues[this.columnMap.Nutzungshinweise]];
    }

    async getDistributions() {
        const types = ['Dateidownload', 'WMS', 'FTP', 'AtomFeed', 'Portal', 'SOS', 'WFS', 'WCS', 'WMTS', 'API'];

        const distributions = [];

        types
            .filter(type => this.columnValues[this.columnMap[type]])
            .forEach(async type => {
                const dist = await this.addDownloadUrls(type, this.columnValues[this.columnMap[type]]);
                distributions.push(...dist);
            });

        return distributions;
    }

    getLicenseId() {
        const license = this.getLicense(this.data.workbook.getWorksheet(3), this.columnValues[this.columnMap.Lizenz]);
        return license.description;
    }

    getLicenseURL() {
        const license = this.getLicense(this.data.workbook.getWorksheet(3), this.columnValues[this.columnMap.Lizenz]);
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
        return this.data.issued ? this.data.issued : new Date(Date.now());
    }

    getMetadataSource() {
        return this.createSourceAttribution('mcloud-excel');
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

    getDisplayContacts() {
        const publisherAbbreviations = this.columnValues[this.columnMap.DatenhaltendeStelle].split(',');
        const publishers = this._getPublishers(this.data.workbook.getWorksheet(2), publisherAbbreviations);

        return publishers.map( p => this.createDisplayContact(p.name, p.url));
    }

    getMFundFKZ() {
        let mfundFkz = this.columnValues[this.columnMap.mFundFoerderkennzeichen];
        if (mfundFkz && (mfundFkz.formula || mfundFkz.sharedFormula)) {
            mfundFkz = mfundFkz.result;
        }
        return mfundFkz && mfundFkz.length > 0 ? mfundFkz : null;
    }

    getMFundProjectTitle() {
        let mfundProject = this.columnValues[this.columnMap.mFundProjekt];
        if (mfundProject && (mfundProject.formula || mfundProject.sharedFormula)) {
            mfundProject = mfundProject.result;
        }
        return mfundProject && mfundProject.length > 0 ? mfundProject : null;
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
     * @param ogdObject
     * @param type
     * @param urlsString
     */
    async addDownloadUrls(type, urlsString) {
        // Check if the cell contains just text or hyperlinked text
        if (urlsString.text) urlsString = urlsString.text;
        const distributions = [];

        let downloads = urlsString.split(/,[\r\n]+/); // comma followed by one or more (carriage returns or newlines)
        for (let i = 0; i < downloads.length; i++) {
            let downloadUrl = downloads[i];

            // skip if downloadURL is empty
            if (downloadUrl.trim().length === 0) continue;

            let checkedUrl = await UrlUtils.urlWithProtocolFor(downloadUrl);

            if (checkedUrl) {
                distributions.push({
                    format: type,
                    accessURL: downloadUrl.trim()
                });
            } else {
                // TODO: handle errors
                /*if (!ogdObject.extras.metadata.harvesting_errors) {
                    ogdObject.extras.metadata.harvesting_errors = [];
                }
                let msg = `Invalid URL '${downloadUrl} found for item with id: '${ogdObject.extras.generated_id}', title: '${ogdObject.title}', index: '${this.elastic.indexName}'.`;
                ogdObject.extras.metadata.harvesting_errors.push(msg);
                log.warn(msg);*/
                log.warn(`Invalid URL '${downloadUrl}' found`);
            }
        }

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
                return this.createLicense(row.values[2], row.values[3], row.values[4]);
            }
        }

        log.warn('Could not find abbreviation of "License": ' + licenseId);
    }

};
