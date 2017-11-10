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

        this.promises = [];
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
            'API': 15,
            'Lizenz': 16,
            'Quellenvermerk': 17,
            'Datentyp': 18,
            'Verfuegbarkeit': 19,
            'Datenformat': 20,
            'Zeitraum': 21,
            'Aktualisierungsdatum': 22,
            'Lizenzbeschreibung': 23,
            'Lizenzlink': 24,
            'DatenhaltendeStelleLang': 25,
            'DatenhaltendeStelleLink': 26
        };

        let workbook = new Excel.Workbook();
        let mapper = this.settings.mapper;
        let elastic = this.elastic;
        const datePattern = /(\d{2})\.(\d{2})\.(\d{4})/;

        elastic.prepareIndex(mapping, settings);

        workbook.xlsx.readFile(this.excelFilepath)
            .then(() => {
                log.debug('done loading file');
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
                        let ogdObject = {};
                        let doc = {};

                        let uniqueName = this.getUniqueName(columnValues[columnMap.Daten]);
                        const dateMetaUpdate = columnValues[columnMap.Aktualisierungsdatum];

                        ogdObject.name = uniqueName;
                        ogdObject.title = columnValues[columnMap.Daten];
                        ogdObject.author = columnValues[columnMap.DatenhaltendeStelleLang].result;
                        ogdObject.type = 'dokument';
                        ogdObject.notes = columnValues[columnMap.Kurzbeschreibung];
                        ogdObject.license_id = columnValues[columnMap.Lizenzbeschreibung].result; // licenses.includes(v[c.Lizenz]) ? v[c.Lizenz] : 'cc-by-4.0';
                        ogdObject.license_url = columnValues[columnMap.Lizenzlink].result;
                        ogdObject.groups = ['transport_verkehr'];

                        ogdObject.extras = {};
                        ogdObject.extras.dates = [];
                        if (dateMetaUpdate) {
                            ogdObject.metadata_modified = dateMetaUpdate instanceof Date ? dateMetaUpdate : new Date(dateMetaUpdate.replace(datePattern, '$3-$2-$1'));
                        }
                        // ogdObject.extras.metadata_original_id = TODO

                        ogdObject.extras.contacts = [{}];
                        ogdObject.extras.contacts[0].name = columnValues[columnMap.Quellenvermerk];
                        ogdObject.extras.contacts[0].role = 'vertrieb';
                        ogdObject.extras.subgroups = this.mapCategories(columnValues[columnMap.Kategorie].split(','));

                        ogdObject.extras.terms_of_use = {};
                        ogdObject.extras.terms_of_use.other = columnValues[columnMap.Nutzungshinweise];

                        ogdObject.extras.metadata_original_portal = columnValues[columnMap.DatenhaltendeStelleLink].result;


                        ogdObject.resources = [];

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
                        if (columnValues[columnMap.WMTS]) {
                            this.addDownloadUrls(ogdObject, 'WMTS', columnValues[columnMap.WMTS]);
                        }
                        if (columnValues[columnMap.API]) {
                            this.addDownloadUrls(ogdObject, 'API', columnValues[columnMap.API]);
                        }

                        mapper.forEach(mapper => mapper.run(ogdObject, doc));

                        let promise = elastic.addDocToBulk(doc, uniqueName);
                        if (promise) this.promises.push(promise);
                    }
                });
                log.debug('sending rest of data');
                this.promises.push(elastic.sendBulkData(false));

                Promise.all(this.promises).then(() => elastic.finishIndex());
            });
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
            }
        });
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
            ogdObject.resources.push({
                format: type,
                url: downloadUrl.trim()
            });
        });
    }

    getUniqueName(baseName) {
        let newName = baseName.replace(/[^a-zA-Z0-9-_]+/g, '').toLowerCase().substring(0, 98);
        let count = this.names[newName];
        if (count) {
            count++;
            newName = newName + count;
        } else {
            count = 1;
        }
        this.names[newName] = count;
        return newName;
    }
}

module.exports = ExcelImporter;
