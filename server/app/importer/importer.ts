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

import type { GeneralSettings } from '@shared/general-config.settings.js';
import log4js from 'log4js';
import type { Observer } from 'rxjs';
import { Observable } from 'rxjs';
import type { Catalog } from '../catalog/catalog.factory.js';
import { CswCatalog } from '../catalog/csw/csw.catalog.js';
import type { ImporterSettings } from './importer.settings.js';
import type { ImportLogMessage } from '../model/import.result.js';
import { Summary } from '../model/summary.js';
import { DatabaseFactory } from '../persistence/database.factory.js';
import type { DatabaseUtils } from '../persistence/database.utils.js';
import { ElasticsearchFactory } from '../persistence/elastic.factory.js';
import type { ElasticsearchUtils } from '../persistence/elastic.utils.js';
import { ProfileFactoryLoader } from '../profiles/profile.factory.loader.js';
import { ConfigService } from '../services/config/ConfigService.js';
import { FilterUtils } from '../utils/filter.utils.js';
import * as MiscUtils from '../utils/misc.utils.js';
import { MailServer } from '../utils/nodemailer.utils.js';

const log = log4js.getLogger(import.meta.filename)

export class HarvestRunCancelledError extends Error {}

/**
 * Base class for all importers.
 *
 * An importer is responsible for the overall harvesting process.
 * This includes
 * - fetching data from third-party sources
 * - splitting the data into singular records and handing them to the appropriate mapper
 * - managing the transaction and pushing the transformed data to the database and the configured catalogs
 */
export abstract class Importer<S extends ImporterSettings> {

    protected filterUtils: FilterUtils;
    protected generalConfig: GeneralSettings;
    protected isIncremental: boolean = false;
    protected observer: Observer<ImportLogMessage>;
    protected harvesterRunCancelled: boolean = false;

    readonly database: DatabaseUtils;
    readonly elastic: ElasticsearchUtils;
    readonly summary: Summary;
    readonly stageSummaries: Summary[] = [];

    protected constructor(readonly settings: S) {
        this.settings = MiscUtils.merge(this.getDefaultSettings(), settings);
        this.filterUtils = new FilterUtils(this.settings);
        this.generalConfig = ConfigService.getGeneralSettings();
        // TODO this needs to be refactored - see below in exec()
        this.summary = new Summary('harvest', this.settings);
        this.database = DatabaseFactory.getDatabaseUtils(this.generalConfig.database, this.summary);
        this.elastic = ElasticsearchFactory.getElasticUtils(this.generalConfig.elasticsearch, this.summary);

        // override harvester-specific setting if the general config param is set
        if (this.generalConfig.allowAllUnauthorizedSSL) {
            this.settings.rejectUnauthorizedSSL = false;
        }
    }

    public cancel(): void {
        this.harvesterRunCancelled = true;
    }

    run(isIncremental: boolean = false): Observable<ImportLogMessage> {
        this.isIncremental = isIncremental;
        this.summary.isIncremental = isIncremental;
        return new Observable<ImportLogMessage>(observer => {
            this.observer = observer;
            this.summary.startTime = new Date();
            this.exec(observer);//.then(() => this.elastic.close());
        });
    }

    async exec(observer: Observer<ImportLogMessage>): Promise<void> {
        // TODO remove Importer.summary - instead, always use a named summary
        // const downloadSummary = this.startStage('harvest');
        if (this.settings.dryRun) {
            log.debug('Dry run option enabled. Skipping index creation.');
            await this.harvest();
            log.debug('Skipping finalisation of index for dry run.');
            observer.next(this.summary.msgComplete('Dry run ... no indexing of data'));
        }
        else {
            let transactionTimestamp: Date;
            let transactionCommitted = false;
            const processedCatalogs: Catalog[] = [];
            try {
                transactionTimestamp = await this.database.beginTransaction();
                // get datasets
                let numIndexDocs = await this.harvest();
                if (this.harvesterRunCancelled) throw new HarvestRunCancelledError();
                if (!this.isIncremental) {
                    // did the harvesting return results at all?
                    if (numIndexDocs == 0) {
                        throw new Error(`No results during ${this.settings.type} import`);
                    }
                    // ensure that less than X percent of existing datasets are slated for deletion
                    let nonFetchedPercentage = await this.database.nonFetchedPercentage(this.settings.sourceURL, transactionTimestamp);
                    let { mail, cancel } = this.generalConfig.harvesting;
                    if (this.generalConfig.mail.enabled && mail.enabled && nonFetchedPercentage > mail.minDifference) {
                        let msg = `Not enough coverage of previous results (${nonFetchedPercentage}%)`;
                        MailServer.getInstance().send(msg, `An error occurred during harvesting: ${msg}`);
                    }
                    if (cancel.enabled && nonFetchedPercentage > cancel.minDifference) {
                        throw new Error(`Not enough coverage of previous results (${nonFetchedPercentage}%)`);
                    }
                }
                // did fatal errors occur (ie DB or APP errors)?
                if (this.summary.errors.some(e => e.type === 'app' || e.type === 'database')) {
                    throw new Error();
                }

                await this.database.deleteNonFetchedDatasets(this.settings.sourceURL, transactionTimestamp);
                await this.database.commitTransaction();
                transactionCommitted = true;
                // TODO support concurrency of different catalogs
                for (const catalogId of this.settings.catalogIds) {
                    if (this.harvesterRunCancelled) throw new HarvestRunCancelledError();
                    const stageSummary = this.startStage(`catalog/${catalogId}`);
                    const catalog = await ProfileFactoryLoader.get().getCatalog(catalogId, stageSummary);
                    try {
                        // log.info(`Starting import for catalog ${catalogId} (${catalog.settings.type}) with transaction timestamp ${transactionTimestamp}`);
                        log.info(`Starting import for catalog ${catalogId} (${catalog.settings.type}) with source ${this.settings.sourceURL}`);

                        // TODO currently this relies on "sourceURL" instead of transactionTimestamp
                        // should this be changed to transactionTimestamp?
                        // for that, we need to consider how to handle "deleted", i.e. non-fetched, datasets

                        await catalog.process(this.settings.sourceURL, this.settings, observer);
                        processedCatalogs.push(catalog);
                    }
                    catch (e) {
                        log.error(`Error while importing into catalog ${catalog.settings.name} (id=${catalogId}):`, e);
                        this.summary.errors.push({ type: 'app', error: `Error while importing into catalog ${catalog.settings.name} (id=${catalogId}): ${e.message}` });
                    }
                }
                await this.postHarvestingHandling();
                observer.next(this.summary.msgComplete());
            }
            catch (err) {
                if (err instanceof HarvestRunCancelledError) {
                    if (!transactionCommitted) {
                        const rollbackDbStage = this.startStage('rollbackSourceImport');
                        await this.database.rollbackTransaction();
                        observer.next(rollbackDbStage.msgComplete('Transaction rolled back'));
                    } else {
                        const rollbackDbStage = this.startStage('rollbackSourceImport');
                        const count = await this.database.rollbackSourceImport(this.settings.sourceURL, transactionTimestamp);
                        observer.next(rollbackDbStage.msgComplete(`Rolled back ${count} records`));
                        for (const catalog of processedCatalogs) {
                            if (catalog instanceof CswCatalog) {
                                const rollbackCatalogStage = this.startStage('rollbackTargetCatalog');
                                await catalog.rollbackTargetCatalog(this.settings.id, transactionTimestamp);
                                observer.next(rollbackCatalogStage.msgComplete());
                            }
                        }
                    }
                    observer.next(this.summary.msgCancelled());
                } else {
                    if (err.message) {
                        this.summary.errors.push({ type: 'app', error: err.message });
                    }
                    await this.database.rollbackTransaction();
                    let msg = this.summary.errors.find(e => e.type === 'app' || e.type === 'database')?.error;
                    log.error(err);
                    observer.next(this.summary.msgComplete(msg));
                }
            }
        }
        observer.complete();
    }

    protected abstract harvest(): Promise<number>;

    protected abstract getDefaultSettings(): S;

    protected async postHarvestingHandling() {
        // For Profile specific Handling
    }

    protected startStage(name: string): Summary {
        const s = new Summary(name, this.settings);
        s.startTime = new Date();
        s.isIncremental = this.isIncremental;
        this.stageSummaries.push(s);
        return s;
    }

    getDownloadMessage(): string {
        return 'Datensätze werden heruntergeladen';
    }
}
