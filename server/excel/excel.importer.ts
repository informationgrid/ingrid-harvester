import {IndexDocument} from '../model/index.document';
import {ElasticSearchUtils} from '../utils/elastic.utils';
import {ExcelMapper} from "./excel.mapper";
import {Worksheet} from "exceljs";
import {elasticsearchMapping} from "../elastic.mapping";
import {elasticsearchSettings} from "../elastic.settings";
import {Summary} from "../model/summary";
import {getLogger} from "log4js";
import {Importer} from "../importer";
import Excel = require('exceljs');

let log = require('log4js').getLogger(__filename),
    logSummary = getLogger('summary');

export type ExcelSettings = {
    importer, elasticSearchUrl, index, indexType, alias, filePath, includeTimestamp, dryRun, currentIndexName, defaultDCATCategory, proxy?
}

export class ExcelImporter implements Importer {

    settings: ExcelSettings;
    elastic: ElasticSearchUtils;
    excelFilepath: string;
    names = {};
    summary: Summary = {
        appErrors: [],
        numDocs: 0,
        numErrors: 0,
        print: () => {
            logSummary.info(`---------------------------------------------------------`);
            logSummary.info(`Summary of: ${this.settings.importer}`);
            logSummary.info(`---------------------------------------------------------`);
            logSummary.info(`Number of records: ${this.summary.numDocs}`);
            logSummary.info(`Number of errors: ${this.summary.numErrors}`);
            logSummary.info(`App-Errors: ${this.summary.appErrors.length}`);
            if (this.summary.appErrors.length > 0) {
                logSummary.info(`\t${this.summary.appErrors.map( e => e + '\n\t')}`);
            }
        }
    };

    /**
     * Create the importer and initialize with settings.
     * @param { {filePath, mapper} }settings
     */
    constructor(settings) {
        this.settings = settings;
        this.elastic = new ElasticSearchUtils(settings);
        this.excelFilepath = settings.filePath;
    }

    async run(): Promise<Summary> {
        // map of the column index to a name
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
            'mFundFoerderkennzeichen': 30,
            'mFundProjekt': 31,
            'DCATKategorie': 32
        };

        let workbook = new Excel.Workbook();

        let promises = [];
        try {
            if (this.settings.dryRun) {
                log.debug('Dry run option enabled. Skipping index creation.');
            } else {
                await this.elastic.prepareIndex(elasticsearchMapping, elasticsearchSettings);
            }
            await workbook.xlsx.readFile(this.excelFilepath);

            log.debug('done loading file');

            let worksheet = workbook.getWorksheet(1);

            // Iterate over all rows that have values in a worksheet
            // prepare all rows for easier value access
            const workUnits = this.prepareExcelRows(worksheet, columnMap);

            // get all generated IDs from each row
            let ids = workUnits.map(unit => unit.id);

            // get all issued dates from IDs
            let timestamps = await this.elastic.getIssuedDates(ids);

            this.settings.currentIndexName = this.elastic.indexName;

            // Attention: forEach does not work with async/await! using Promise.all for sequence
            await Promise.all(workUnits.map(async (unit, idx) => {

                this.summary.numDocs++;

                // create json document and create values with ExcelMapper
                let mapper = new ExcelMapper(this.settings, {
                    id: unit.id,
                    columnValues: unit.columnValues,
                    issued: timestamps[idx],
                    workbook: workbook,
                    columnMap: columnMap,
                    summary: this.summary
                });
                let doc = await IndexDocument.create(mapper).catch( e => {
                    log.error('Error creating index document', e);
                    this.summary.appErrors.push(e.toString());
                    mapper.skipped = true;
                });

                // add document to buffer and send to elasticsearch if full
                if (!this.settings.dryRun && !mapper.shouldBeSkipped()) {
                    promises.push(this.elastic.addDocToBulk(doc, unit.id));
                }
            }));

            log.debug('Waiting for #promises to finish: ' + promises.length);
            return Promise.all(promises)
                .then(() => {
                    if (this.settings.dryRun) {
                        log.debug('Skipping finalisation of index for dry run.');
                    } else {
                        log.debug('All promises finished ... continue');
                        return this.elastic.finishIndex();
                    }
                })
                .then( () => this.summary )
                .catch(err => log.error('Error importing excel row', err));
        } catch(error) {
            log.error('Error reading excel workbook', error);
            this.summary.numErrors++;
            return this.summary;
        }
    }

    /**
     * Generate unique name from a given string.
     * @param baseName
     */
    private getUniqueName(baseName: string) {
        let newName = '_mcloudde_' + baseName.replace(/[^a-zA-Z0-9-_]+/g, '').toLowerCase().substring(0, 98);
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

    private prepareExcelRows(worksheet: Worksheet, columnMap) {
        let workUnits = [];

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
        return workUnits;
    }
}
