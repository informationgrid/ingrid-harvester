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

import exceljs from 'exceljs';
import log4js from 'log4js';
import type { Observer } from 'rxjs';
import type { RecordEntity } from '../../model/entity.js';
import type { ImportLogMessage } from '../../model/import.result.js';
import { ImportResult } from '../../model/import.result.js';
import type { IndexDocument } from '../../model/index.document.js';
import { ElasticsearchUtils } from '../../persistence/elastic.utils.js';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader.js';
import * as MiscUtils from '../../utils/misc.utils.js';
import { Importer } from '../importer.js';
import { ExcelSparseMapper } from './excelsparse.mapper.js';
import type { ExcelSparseSettings } from './excelsparse.settings.js';
import { defaultExcelSparseSettings } from './excelsparse.settings.js';

const log = log4js.getLogger(import.meta.filename);

export class ExcelSparseImporter extends Importer<ExcelSparseSettings> {

    excelFilepath: string;
    names = {};
    columnMap: Columns;

    constructor(settings: ExcelSparseSettings) {
        // merge default settings with configured ones
        settings = MiscUtils.merge(defaultExcelSparseSettings, settings);
        super(settings);

        this.excelFilepath = settings.filePath;
    }

    async exec(observer: Observer<ImportLogMessage>): Promise<void> {
        let harvestTime = new Date(Date.now());

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
            // if (this.getSettings().dryRun) {
            //     log.debug('Dry run option enabled. Skipping index creation.');
            // } else {
            //     await this.elastic.prepareIndex(this.profile.getIndexMappings(), this.profile.getIndexSettings());
            // }
            await workbook.xlsx.readFile(this.excelFilepath);

            log.debug('done loading file');

            let generalInfo = {};
            generalInfo = MiscUtils.merge(generalInfo, this.getSettings().catalog);
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
                this.getSummary().numDocs++;

                if (!this.filterUtils.isIdAllowed(unit.id)) {
                    this.getSummary().skippedDocs.push(unit.id);
                    continue;
                }

                // create json document and create values with ExcelMapper
                let mapper = (await ProfileFactoryLoader.get().getMapper(this.getSettings(), harvestTime, this.getSummary(), {
                    id: unit.id,
                    columnValues: unit.columnValues,
                    workbook: workbook,
                    columnMap: this.columnMap,
                    currentIndexName: this.elastic.indexName,
                    summary: this.getSummary()
                }), generalInfo) as ExcelSparseMapper;

                // add document to buffer and send to elasticsearch if full
                let doc: IndexDocument;
                try {
                    doc = await mapper.createEsDocument();
                }
                catch (e) {
                    this.handleIndexDocError(e, mapper);
                }

                if (!this.getSettings().dryRun && !mapper.shouldBeSkipped()) {
                    let entity: RecordEntity = {
                        identifier: unit.id,
                        source: this.getSettings().filePath,
                        collection_id: (await this.database.getCatalog(this.getSettings().catalogId)).id,
                        dataset: doc,
                        original_document: mapper.getHarvestedData()
                    };
                    promises.push(
                        this.database.addEntityToBulk(entity).then(response => {
                            if (!response.queued) {
                                //let currentPos = this.getSummary().numDocs++;
                                numIndexDocs += ElasticsearchUtils.maxBulkSize;
                                observer.next(ImportResult.running(numIndexDocs, workUnits.length));
                            }
                        })
                    );
                }
                else {
                    this.getSummary().skippedDocs.push(unit.id);
                }
            }

            log.debug('Waiting for #promises to finish: ' + promises.length);
            let transactionTimestamp = await this.database.beginTransaction();
            await Promise.allSettled(promises).catch(err => log.error('Error importing excel row', err));
            await this.database.sendBulkData();
            await this.database.deleteNonFetchedDatasets(this.getSettings().sourceURL, transactionTimestamp);
            await this.database.commitTransaction();
            await this.database.pushToElastic3ReturnOfTheJedi(this.elastic, this.getSettings().filePath);
            observer.next(ImportResult.message('Running post operations'));
            observer.next(ImportResult.complete(this.getSummary()));
        }
        catch(error) {
            log.error('Error reading excel workbook', error);
            this.getSummary().numErrors++;
            this.getSummary().appErrors.push('Error reading excel workbook: ' + error);
            observer.next(ImportResult.complete(this.getSummary()));

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
        this.getSummary().appErrors.push(e.toString());
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
