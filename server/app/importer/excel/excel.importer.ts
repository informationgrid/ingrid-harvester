/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2024 wemove digital solutions GmbH
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
import { defaultExcelSettings, ExcelSettings } from './excel.settings';
import { ElasticsearchUtils } from '../../persistence/elastic.utils';
import { ExcelMapper } from './excel.mapper';
import { Importer } from '../importer';
import { ImportLogMessage, ImportResult } from '../../model/import.result';
import { Observer } from 'rxjs';
import { ProfileFactory } from '../../profiles/profile.factory';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader';
import { RecordEntity } from '../../model/entity';
import { Summary } from '../../model/summary';
import { Workbook, Worksheet } from 'exceljs';

const log = require('log4js').getLogger(__filename);

export class ExcelImporter extends Importer {
    private profile: ProfileFactory<ExcelMapper>;
    settings: ExcelSettings;
    excelFilepath: string;
    names = {};

    /**
     * Create the importer and initialize with settings.
     * @param { {filePath, mapper} }settings
     */
    constructor(settings) {
        super(settings);

        this.profile = ProfileFactoryLoader.get();

        // merge default settings with configured ones
        settings = MiscUtils.merge(defaultExcelSettings, settings);

        this.settings = settings;
        this.excelFilepath = settings.filePath;
    }

    async exec(observer: Observer<ImportLogMessage>): Promise<void> {

        observer.next(ImportResult.message('Starting Excel Importer'));

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
            'Periodizitaet': 24,
            'Lizenzbeschreibung': 25,
            'Lizenzlink': 26,
            'DatenhaltendeStelleLang': 27,
            'DatenhaltendeStelleLink': 28,
            'mFundFoerderkennzeichen': 30,
            'mFundProjekt': 31,
            'DCATKategorie': 32
        };

        let workbook = new Workbook();

        let promises = [];
        try {
            // if (this.settings.dryRun) {
            //     log.debug('Dry run option enabled. Skipping index creation.');
            // } else {
            //     await this.elastic.prepareIndex(this.profile.getIndexMappings(), this.profile.getIndexSettings());
            // }
            await workbook.xlsx.readFile(this.excelFilepath);

            log.debug('done loading file');

            let worksheet = workbook.getWorksheet(1);

            // Iterate over all rows that have values in a worksheet
            // prepare all rows for easier value access
            const workUnits = this.prepareExcelRows(worksheet, columnMap);

            // get all generated IDs from each row
            let ids = workUnits.map(unit => unit.id);

            // get all issued dates from IDs
            observer.next(ImportResult.message('Getting previous issued dates'));

            let numIndexDocs = 0;

            // Attention: forEach does not work with async/await! using Promise.all for sequence
            // await Promise.all(workUnits.map(async (unit, idx) => {
            for (let idx=0; idx<workUnits.length; idx++) {
                let unit = workUnits[idx];
                this.summary.numDocs++;

                if (!this.filterUtils.isIdAllowed(unit.id)) {
                    this.summary.skippedDocs.push(unit.id);
                    continue;
                }

                // create json document and create values with ExcelMapper
                let mapper = new ExcelMapper(this.settings, {
                    id: unit.id,
                    columnValues: unit.columnValues,
                    workbook: workbook,
                    columnMap: columnMap,
                    currentIndexName: this.elastic.indexName,
                    summary: this.summary
                });

                // add document to buffer and send to elasticsearch if full
                if (!this.settings.dryRun && !mapper.shouldBeSkipped()) {
                    let doc = await this.profile.getIndexDocumentFactory(mapper).create().catch(e => this.handleIndexDocError(e, mapper));
                    let entity: RecordEntity = {
                        identifier: unit.id,
                        source: this.settings.filePath,
                        collection_id: (await this.database.getCatalog(this.settings.catalogId)).id,
                        dataset: doc,
                        original_document: mapper.getHarvestedData()
                    };
                    promises.push(
                        this.database.addEntityToBulk(entity).then(response => {
                            if (!response.queued) {
                                //let currentPos = this.summary.numDocs++;
                                numIndexDocs += ElasticsearchUtils.maxBulkSize;
                                observer.next(ImportResult.running(numIndexDocs, workUnits.length));
                            }
                        })
                    );
                }
            }

            log.debug('Waiting for #promises to finish: ' + promises.length);
            await this.database.beginTransaction();
            Promise.all(promises)
                .then(async () => {
                    await this.database.commitTransaction();
                    this.database.pushToElastic3ReturnOfTheJedi(this.elastic, this.settings.filePath);
                })
                .then(() => observer.next(ImportResult.message('Running post operations')))
                // .then(() => this.elastic.finishIndex())
                .then( () => {
                    observer.next(ImportResult.complete(this.summary));
                    observer.complete();
                } )
                .catch(err => log.error('Error importing excel row', err));
        } catch(error) {
            log.error('Error reading excel workbook', error);
            this.summary.numErrors++;
            this.summary.appErrors.push('Error reading excel workbook: ' + error);
            observer.next(ImportResult.complete(this.summary));
            observer.complete();

            // clean up index
            // await this.elastic.deleteIndex(this.elastic.indexName);
        }
    }

    // TODO move implementation from exec() to harvest() so that super.exec can be used
    protected async harvest(): Promise<number> {
        return null;
    }

    private handleIndexDocError(e, mapper) {
        log.error('Error creating index document', e);
        this.summary.appErrors.push(e.toString());
        mapper.skipped = true;
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
                for (let i = 0; i < parseInt(row.values.length.toString()); i++) {
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

    getSummary(): Summary {
        return this.summary;
    }

}
