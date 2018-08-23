'use strict';

let log = require('log4js').getLogger(__filename),
    ElasticSearchUtils = require('./../elastic-utils'),
    mapping = require('../elastic.mapping.js'),
    settings = require('../elastic.settings.js'),
    Excel = require('exceljs'),
    Promise = require('promise');

class ExcelImporter {

    /**
     * Create the importer and initialize with settings.
     * @param { {filePath, mapper} }settings
     */
    constructor(settings) {
        this.settings = settings;
        this.elastic = new ElasticSearchUtils(settings);
        this.excelFilepath = settings.filePath;

        this.names = {};
    }

    async run() {
        // let licenses = ['apache', 'app_commercial', 'app_freeware', 'app_opensource', 'bsd-license', 'cc-by', 'cc-by-sa', 'cc-nc', 'cc-by-nd', 'cc-zero', 'cc-by-4.0', 'cc-by-nc-4.0', 'cc-by-sa-4.0', 'cc-by-nd-4.0', 'dl-de-by-1.0', 'dl-de-by-nc-1.0', 'dl-de-zero-2.0', 'dl-de-by-2.0', 'geolizenz-v1.2.1-open', 'geolizenz-v1.2-1a', 'geolizenz-v1.2-1b', 'geolizenz-v1.2-2a', 'geolizenz-v1.2-2b', 'geolizenz-v1.2-3a', 'geolizenz-v1.2-3b', 'geolizenz-v1.2-4a', 'geolizenz-v1.2-4b', 'geonutzv-de-2013-03-19', 'gfdl', 'gpl-3.0', 'mozilla', 'odc-by', 'odc-odbl', 'odc-pddl', 'official-work', 'other-closed', 'other-open'];
        let columnMap = {
            'Daten': 1,
            'Kurzbeschreibung': 2,
            'Nutzungshinweise': 3,
            'DatenhaltendeStelle': 4,
            'Kategorie': 5,
            'Quellentyp': 6,
            'Dateidownload': 7,
            'WMS': 8,
            'FTP': 9,
            'AtomFeed': 10,
            'Portal': 11,
            'SOS': 12,
            'WFS': 13,
            'WMTS': 14,
            'WCS': 15,
            'API': 16,
            'Lizenz': 17,
            'Quellenvermerk': 18,
            'Datentyp': 19,
            'Verfuegbarkeit': 20,
            'Datenformat': 21,
            'Zeitraum': 22,
            'Aktualisierungsdatum': 23,
            'Echtzeitdaten': 24,
            'Lizenzbeschreibung': 25,
            'Lizenzlink': 26,
            'DatenhaltendeStelleLang': 27,
            'DatenhaltendeStelleLink': 28,
            'mFundFoerderkennzeichen': 30
        };

        let workbook = new Excel.Workbook();
        let elastic = this.elastic;

        let promises = [];
        try {
            await elastic.prepareIndex(mapping, settings)
            await workbook.xlsx.readFile(this.excelFilepath)

            log.debug('done loading file');

            let workUnits = [];
            let worksheet = workbook.getWorksheet(1);

            // Iterate over all rows that have values in a worksheet
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber > 1) {
                    let columnValues = [];
                    for (let i = 0; i < row.values.length; i++) {
                        let cur = row.values[i];
                        if (!cur) {
                            columnValues.push('');
                            continue;
                        }

                        if (cur.richText) {
                            let clean = '';
                            for (let i in cur.richText) {
                                clean += cur.richText[i].text;
                            }
                            columnValues.push(clean);
                        } else {
                            columnValues.push(cur);
                        }
                    }
                    if (columnValues.length != row.values.length) {
                        log.debug(columnValues.length + ' : ' + row.values.length);
                    }
                    let id = this.getUniqueName(columnValues[columnMap.Daten]);
                    workUnits.push({id: id,  columnValues: columnValues});
                }
            });

            let ids = workUnits.map(unit => unit.id);
            let timestamps = await this.elastic.getIssuedDates(ids);

            workUnits.forEach((unit, idx) => {
                promises.push(this.importSingleRow({
                    id: unit.id,
                    columnValues: unit.columnValues,
                    issued: timestamps[idx],
                    workbook: workbook,
                    columnMap: columnMap
                }));
            });
            Promise.all(promises)
                .then(() => elastic.finishIndex())
                .catch(err => log.error('Error importing excel row', err));
        } catch(error) {
            log.error("Error reading excel workbook\n", error);
        }
    }

    /**
     * Import a single row from the excel workbook to elasticsearch index
     *
     * @param args {getUniqueName, issuedExisting, workbook, columnMap, columnValues}
     * @returns {Promise<void>}
     */
    async importSingleRow(args) {
        let uniqueName = args.id;
        let issuedExisting = args.issued;
        let columnValues = args.columnValues;
        let columnMap = args.columnMap;
        let workbook = args.workbook;

        const datePattern = /(\d{2})\.(\d{2})\.(\d{4})/;

        log.debug("Processing excel dataset with title : " + columnValues[columnMap.Daten]);

        let ogdObject = {};
        let doc = {};

        const dateMetaUpdate = columnValues[columnMap.Aktualisierungsdatum];

        let title = columnValues[columnMap.Daten];
        ogdObject.title = title.trim(); // Remove leading and trailing whitspace

        const publisherAbbreviations = columnValues[columnMap.DatenhaltendeStelle].split(',');
        const publishers = this.getPublishers(workbook.getWorksheet(2), publisherAbbreviations);
        const license = this.getLicense(workbook.getWorksheet(3), columnValues[columnMap.Lizenz]);

        if (publishers.length > 0) ogdObject.publisher = publishers;
        ogdObject.description = columnValues[columnMap.Kurzbeschreibung];
        ogdObject.theme = ['http://publications.europa.eu/resource/authority/data-theme/TRAN']; // see https://joinup.ec.europa.eu/release/dcat-ap-how-use-mdr-data-themes-vocabulary

        ogdObject.extras = {};
        ogdObject.extras.metadata = {};
        if (dateMetaUpdate) {
            ogdObject.modified = dateMetaUpdate instanceof Date ? dateMetaUpdate : new Date(dateMetaUpdate.replace(datePattern, '$3-$2-$1'));
        }

        let now = new Date(Date.now());
        let issued = issuedExisting ? issuedExisting : now;
        ogdObject.extras.generated_id = uniqueName;
        ogdObject.extras.metadata.modified = now;
        ogdObject.extras.metadata.issued = issued;
        ogdObject.extras.metadata.source = { attribution: 'mcloud-excel' };

        ogdObject.extras.license_id = license.description; // licenses.includes(v[c.Lizenz]) ? v[c.Lizenz] : 'cc-by-4.0';
        ogdObject.extras.license_url = license.link;
        ogdObject.extras.realtime = columnMap.Echtzeitdaten === 1;
        // ogdObject.extras.metadata_original_id = TODO
        ogdObject.extras.temporal = columnValues[columnMap.Zeitraum];

        ogdObject.extras.citation = columnValues[columnMap.Quellenvermerk];
        ogdObject.extras.subgroups = this.mapCategories(columnValues[columnMap.Kategorie].split(','));

        let accessRights = columnValues[columnMap.Nutzungshinweise];
        if (accessRights.trim() !== '') {
            ogdObject.accessRights = [columnValues[columnMap.Nutzungshinweise]];
        }

        let mfundFkz = columnValues[columnMap.mFundFoerderkennzeichen];
        if (mfundFkz.formula || mfundFkz.sharedFormula) {
            let mfundFkzResult = mfundFkz.result;
            ogdObject.extras.mfund_fkz = mfundFkzResult ? mfundFkzResult : '0';

        } else {
            ogdObject.extras.mfund_fkz = mfundFkz;
        }

        ogdObject.distribution = [];

        if (columnValues[columnMap.Dateidownload]) {
            this.addDownloadUrls(ogdObject, 'Dateidownload', columnValues[columnMap.Dateidownload]);
        }
        if (columnValues[columnMap.WMS]) {
            this.addDownloadUrls(ogdObject, 'WMS', columnValues[columnMap.WMS]);
        }
        if (columnValues[columnMap.FTP]) {
            this.addDownloadUrls(ogdObject, 'FTP', columnValues[columnMap.FTP]);
        }
        if (columnValues[columnMap.AtomFeed]) {
            this.addDownloadUrls(ogdObject, 'AtomFeed', columnValues[columnMap.AtomFeed]);
        }
        if (columnValues[columnMap.Portal]) {
            this.addDownloadUrls(ogdObject, 'Portal', columnValues[columnMap.Portal]);
        }
        if (columnValues[columnMap.SOS]) {
            this.addDownloadUrls(ogdObject, 'SOS', columnValues[columnMap.SOS]);
        }
        if (columnValues[columnMap.WFS]) {
            this.addDownloadUrls(ogdObject, 'WFS', columnValues[columnMap.WFS]);
        }
        if (columnValues[columnMap.WCS]) {
            this.addDownloadUrls(ogdObject, 'WCS', columnValues[columnMap.WCS]);
        }
        if (columnValues[columnMap.WMTS]) {
            this.addDownloadUrls(ogdObject, 'WMTS', columnValues[columnMap.WMTS]);
        }
        if (columnValues[columnMap.API]) {
            this.addDownloadUrls(ogdObject, 'API', columnValues[columnMap.API]);
        }

        this.settings.mapper.forEach(mapper => mapper.run(ogdObject, doc));

        let promise = this.elastic.addDocToBulk(doc, uniqueName);
        if (promise) return promise;
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

    getPublishers(authorsSheet, /*string[]*/abbreviations) {
        let publishers = [];
        const numAuthors = authorsSheet.rowCount;
        abbreviations.forEach( abbr => {
            let found = false;
            for (let i=2; i<=numAuthors; i++) {
                const row = authorsSheet.getRow(i);
                if (row.values[1] === abbr) {
                    publishers.push({
                        organization: row.values[2],
                        homepage: row.values[4]
                    })
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

    getLicense(licenseSheet, /*string*/licenseId) {
        licenseId = licenseId.toLowerCase();
        const numLicenses = licenseSheet.rowCount;

        for (let i=2; i<=numLicenses; i++) {
            const row = licenseSheet.getRow(i);
            if (row.values[1].toLowerCase() === licenseId) {
                return {
                    description: row.values[2],
                    abbreviation: row.values[3],
                    link: row.values[4]
                };
            }
        }

        log.warn('Could not find abbreviation of "License": ' + licenseId);
    }

    /**
     * Split download urls and add each one to the resource.
     * @param ogdObject
     * @param type
     * @param urlsString
     */
    addDownloadUrls(ogdObject, type, urlsString) {
        // console.log('urlstring:', urlsString);
        let downloads = urlsString.split(',');
        downloads.forEach( downloadUrl => {
            ogdObject.distribution.push({
                format: type,
                accessURL: downloadUrl.trim()
            });
        });
    }

    getUniqueName(baseName) {
        let newName = baseName.replace(/[^a-zA-Z0-9-_]+/g, '').toLowerCase().substring(0, 98);
        let candidate = newName;
        let count = this.names[newName];
        if (count) {
            count++;
            candidate = candidate + count;
        } else {
            count = 1;
        }
        this.names[newName] = count;
        return candidate;
    }
}

module.exports = ExcelImporter;
