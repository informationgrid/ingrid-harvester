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

import * as MiscUtils from '../../utils/misc.utils.js';
import log4js from 'log4js';
import { defaultExcelSparseSettings, ExcelSparseSettings } from './excelsparse.settings.js';
import { ElasticsearchUtils } from '../../persistence/elastic.utils.js';
import { ExcelSparseMapper } from './excelsparse.mapper.js';
import { Importer } from '../importer.js';
import { ImportLogMessage, ImportResult } from '../../model/import.result.js';
import { Observer } from 'rxjs';
import { ProfileFactory } from '../../profiles/profile.factory.js';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader.js';
import { RecordEntity } from '../../model/entity.js';
import { Summary } from '../../model/summary.js';
import exceljs from 'exceljs';

const log = log4js.getLogger(import.meta.filename);

export class ExcelSparseImporter extends Importer {

    protected profile: ProfileFactory<ExcelSparseMapper>;
    protected settings: ExcelSparseSettings;

    excelFilepath: string;
    names = {};
    columnMap: Columns;

    /**
     * Create the importer and initialize with settings.
     * @param { {filePath, mapper} }settings
     */
    constructor(settings) {
        super(settings);

        this.profile = ProfileFactoryLoader.get();

        // merge default settings with configured ones
        settings = MiscUtils.merge(defaultExcelSparseSettings, settings);

        this.settings = settings;
        this.excelFilepath = settings.filePath;
    }

    async exec(observer: Observer<ImportLogMessage>): Promise<void> {

        observer.next(ImportResult.message('Starting Excel Importer'));

        this.columnMap = {
            NAME: null,
            LAT: null,
            LON: null,
            URL_VERFAHREN_OFFEN: null,
            URL_VERFAHREN_ABGESCHLOSSEN: null,
            MITGLIEDSGEMEINDEN: null,
            KONTAKT_EMAIL_1: null,
            KONTAKT_EMAIL_2: null
        };

        let workbook = new exceljs.Workbook();

        let promises = [];
        try {
            // if (this.settings.dryRun) {
            //     log.debug('Dry run option enabled. Skipping index creation.');
            // } else {
            //     await this.elastic.prepareIndex(this.profile.getIndexMappings(), this.profile.getIndexSettings());
            // }
            await workbook.xlsx.readFile(this.excelFilepath);

            log.debug('done loading file');

            let generalInfo = {};
            generalInfo = MiscUtils.merge(generalInfo, this.settings.catalog);
            generalInfo['publisher'] = [{ name: '' }];
            generalInfo['contactPoint'] = {};

            let worksheet = workbook.getWorksheet(1);

            // Iterate over all rows that have values in a worksheet
            // prepare all rows for easier value access
            const workUnits = this.prepareExcelRows(worksheet);

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
                let mapper = new ExcelSparseMapper(this.settings, {
                    id: unit.id,
                    columnValues: unit.columnValues,
                    workbook: workbook,
                    columnMap: this.columnMap,
                    currentIndexName: this.elastic.indexName,
                    summary: this.summary
                }, generalInfo);

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
            let transactionTimestamp = await this.database.beginTransaction();
            await Promise.allSettled(promises).catch(err => log.error('Error importing excel row', err));
            await this.database.sendBulkData();
            await this.database.deleteNonFetchedDatasets(this.settings.sourceURL, transactionTimestamp);
            await this.database.commitTransaction();
            await this.database.pushToElastic3ReturnOfTheJedi(this.elastic, this.settings.filePath);
            observer.next(ImportResult.message('Running post operations'));
            observer.next(ImportResult.complete(this.summary));
        }
        catch(error) {
            log.error('Error reading excel workbook', error);
            this.summary.numErrors++;
            this.summary.appErrors.push('Error reading excel workbook: ' + error);
            observer.next(ImportResult.complete(this.summary));

            // clean up index
            // await this.elastic.deleteIndex(this.elastic.indexName);
        }
        observer.complete();
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
    private getUniqueName(...baseNames: string[]) {
        let newName = '_mcloudde_' + baseNames.map(name => (name + '').replace(/[^a-zA-Z0-9-_]+/g, '#').toLowerCase().substring(0, 98)).join('#');
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

    private prepareExcelRows(worksheet: exceljs.Worksheet) {
        let workUnits = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber == 1) {
                for (let i = 0; i < parseInt(row.values.length.toString()); i++) {
                    this.columnMap[row.values[i]] = i;
                }
            }
            else {
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
                let id = this.getUniqueName(columnValues[this.columnMap.LAT], columnValues[this.columnMap.LON]);
                workUnits.push({id: id,  columnValues: columnValues});
            }
        });
        return workUnits;
    }

    getSummary(): Summary {
        return this.summary;
    }
}

export interface Columns {
    NAME: string,
    LAT: string,
    LON: string,
    URL_VERFAHREN_OFFEN?: string,
    URL_VERFAHREN_ABGESCHLOSSEN?: string,
    URL_VERFAHREN_FNP_LAUFEND?: string,
    URL_VERFAHREN_FNP_ABGESCHLOSSEN?: string,
    URL_VERFAHREN_BEBAUUNGSPLAN_LAUFEND?: string,
    URL_VERFAHREN_BEBAUUNGSPLAN_ABGESCHLOSSEN?: string,
    MITGLIEDSGEMEINDEN: string,
    KONTAKT_EMAIL_1?: string,
    KONTAKT_EMAIL_2?: string
}
