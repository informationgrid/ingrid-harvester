'use strict';

let log = require('log4js').getLogger(__filename),
    ElasticSearchUtils = require('./../elastic-utils'),
    mapping = require('../elastic.mapping.js'),
    Excel = require('exceljs');

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

    /**
     * Requests a dataset with the given ID and imports it to Elasticsearch.
     * @param {string} id
     * @param {function} callback
     */
    importDataset(id, callback) {
        let options = Object.assign({}, this.options_url_dataset);
        options.uri += id;
        try {
            let json = ''; //request.get( options );
            let doc = {};
            log.debug('dataset: ' + id);

            // process all tasks in the mapping pipeline
            this.settings.mapper.forEach(mapper => mapper.run(json, doc));

            this.elastic.addDocToBulk(doc, doc.id);

            // signal finished operation so that the next asynchronous task can run
            callback();

        } catch (err) {
            log.error('Error: ' + err.statusCode);
        }
    }


    async run() {
        let licenses = ['apache', 'app_commercial', 'app_freeware', 'app_opensource', 'bsd-license', 'cc-by', 'cc-by-sa', 'cc-nc', 'cc-by-nd', 'cc-zero', 'cc-by-4.0', 'cc-by-nc-4.0', 'cc-by-sa-4.0', 'cc-by-nd-4.0', 'dl-de-by-1.0', 'dl-de-by-nc-1.0', 'dl-de-zero-2.0', 'dl-de-by-2.0', 'geolizenz-v1.2.1-open', 'geolizenz-v1.2-1a', 'geolizenz-v1.2-1b', 'geolizenz-v1.2-2a', 'geolizenz-v1.2-2b', 'geolizenz-v1.2-3a', 'geolizenz-v1.2-3b', 'geolizenz-v1.2-4a', 'geolizenz-v1.2-4b', 'geonutzv-de-2013-03-19', 'gfdl', 'gpl-3.0', 'mozilla', 'odc-by', 'odc-odbl', 'odc-pddl', 'official-work', 'other-closed', 'other-open'];
        let c = {
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
        };

        var workbook = new Excel.Workbook();
        let mapper = this.settings.mapper;
        let elastic = this.elastic;

        elastic.prepareIndex(mapping);

        workbook.xlsx.readFile(this.excelFilepath)
            .then(() => {
                log.debug('done loading file');
                var worksheet = workbook.getWorksheet(1);
                // Iterate over all rows that have values in a worksheet
                worksheet.eachRow((row, rowNumber) => {
                    if (rowNumber > 1) {
                        let v = [];
                        for (let i = 0; i < row.values.length; i++) {
                            let cur = row.values[i];
                            if (!cur) {
                                v.push('');
                                continue;
                            }

                            if (cur.richText) {
                                let clean = '';
                                for (let i in cur.richText) {
                                    clean += cur.richText[i].text;
                                }
                                v.push(clean);
                            } else {
                                v.push(cur);
                            }
                        }
                        if (v.length != row.values.length) {
                            log.debug(v.length + ' : ' + row.values.length);
                        }
                        let ogdObject = {};
                        let doc = {};

                        ogdObject.name = this.getUniqueName(v[c.Daten]);
                        ogdObject.title = v[c.Daten];
                        ogdObject.author = v[c.DatenhaltendeStelle];
                        ogdObject.type = 'dokument';
                        ogdObject.notes = v[c.Kurzbeschreibung];
                        ogdObject.license_id = licenses.includes(v[c.Lizenz]) ? v[c.Lizenz] : 'cc-by-4.0';
                        ogdObject.groups = 'transport_verkehr';

                        ogdObject.extras = {};
                        ogdObject.extras.dates = [];
                        // ogdObject.extras.metadata_original_id = TODO

                        ogdObject.extras.contacts = [{}];
                        ogdObject.extras.contacts[0].name = v[c.Quellenvermerk];
                        ogdObject.extras.contacts[0].role = 'vertrieb';
                        ogdObject.extras.subgroups = this.mapCategories(v[c.Kategorie].split(','));

                        ogdObject.extras.terms_of_use = {};
                        ogdObject.extras.terms_of_use.other = v[c.Nutzungshinweise];


                        ogdObject.resources = [];

                        if (v[c.Dateidownload]) {
                            ogdObject.resources.push({
                                format: 'Dateidownload',
                                url: v[c.Dateidownload]
                            });
                        }
                        if (v[c.WMS]) {
                            ogdObject.resources.push({
                                format: 'WMS',
                                url: v[c.WMS]
                            });
                        }
                        if (v[c.FTP]) {
                            ogdObject.resources.push({
                                format: 'FTP',
                                url: v[c.FTP]
                            });
                        }
                        if (v[c.AtomFeed]) {
                            ogdObject.resources.push({
                                format: 'AtomFeed',
                                url: v[c.AtomFeed]
                            });
                        }
                        if (v[c.Portal]) {
                            ogdObject.resources.push({
                                format: 'Portal',
                                url: v[c.Portal]
                            });
                        }
                        if (v[c.SOS]) {
                            ogdObject.resources.push({
                                format: 'SOS',
                                url: v[c.SOS]
                            });
                        }
                        if (v[c.WFS]) {
                            ogdObject.resources.push({
                                format: 'WFS',
                                url: v[c.WFS]
                            });
                        }
                        if (v[c.WMTS]) {
                            ogdObject.resources.push({
                                format: 'WMTS',
                                url: v[c.WMTS]
                            });
                        }
                        if (v[c.API]) {
                            ogdObject.resources.push({
                                format: 'API',
                                url: v[c.API]
                            });
                        }

                        mapper.forEach(mapper => mapper.run(ogdObject, doc));

                        let promise = elastic.addDocToBulk(doc, rowNumber);
                        if (promise) this.promises.push(promise);
                    }
                });
                log.debug('sending all data');
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
            case 'Luftfahrt': return 'aviation';
            }
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
