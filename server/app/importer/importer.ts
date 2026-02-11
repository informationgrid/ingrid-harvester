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
import type { ImporterSettings } from '../importer.settings.js';
import type { ImportLogMessage } from '../model/import.result.js';
import { ImportResult } from '../model/import.result.js';
import { Summary } from '../model/summary.js';
import { DatabaseFactory } from '../persistence/database.factory.js';
import type { DatabaseUtils } from '../persistence/database.utils.js';
import { ElasticsearchFactory } from '../persistence/elastic.factory.js';
import type { IndexConfiguration } from '../persistence/elastic.setting.js';
import type { ElasticsearchUtils } from '../persistence/elastic.utils.js';
import { ProfileFactoryLoader } from '../profiles/profile.factory.loader.js';
import { ConfigService } from '../services/config/ConfigService.js';
import { FilterUtils } from '../utils/filter.utils.js';
import { MailServer } from '../utils/nodemailer.utils.js';

const log = log4js.getLogger(import.meta.filename)

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

    private readonly settings: S;
    private readonly summary: Summary;
    protected filterUtils: FilterUtils;
    protected generalConfig: GeneralSettings;
    protected observer: Observer<ImportLogMessage>;

    readonly database: DatabaseUtils;
    readonly elastic: ElasticsearchUtils;

    protected constructor(settings: S) {
        this.filterUtils = new FilterUtils(settings);
        this.generalConfig = ConfigService.getGeneralSettings();
        this.summary = new Summary(settings);

        let elasticsearchConfig: IndexConfiguration = {
            ...this.generalConfig.elasticsearch,
            includeTimestamp: true,
            dryRun: settings.dryRun,
            addAlias: !settings.disable
        };

        this.database = DatabaseFactory.getDatabaseUtils(this.generalConfig.database, this.summary);
        this.elastic = ElasticsearchFactory.getElasticUtils(elasticsearchConfig, this.summary);

        // override harvester-specific setting if the general config param is set
        if (this.generalConfig.allowAllUnauthorizedSSL) {
            settings.rejectUnauthorizedSSL = false;
        }
        this.settings = settings;
    }

    run: Observable<ImportLogMessage> = new Observable<ImportLogMessage>(observer => {
        this.observer = observer;
        this.exec(observer).then(() => this.elastic.close());
    });

    async exec(observer: Observer<ImportLogMessage>): Promise<void> {
        if (this.settings.dryRun) {
            log.debug('Dry run option enabled. Skipping index creation.');
            await this.harvest();
            log.debug('Skipping finalisation of index for dry run.');
            observer.next(ImportResult.complete(this.summary, 'Dry run ... no indexing of data'));
        }
        else {
            try {
                let transactionTimestamp = await this.database.beginTransaction();
                // get datasets
                let numIndexDocs = await this.harvest();
                if (!this.settings.isIncremental) {
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
                if (this.summary.databaseErrors.length > 0 || this.summary.appErrors.length > 0) {
                    throw new Error();
                }

                await this.database.deleteNonFetchedDatasets(this.settings.sourceURL, transactionTimestamp);
                await this.database.commitTransaction();
                // TODO support concurrency of different catalogs
                for (const catalogId of this.getSettings().catalogIds) {
                    try {
                        const catalog = await ProfileFactoryLoader.get().getCatalog(catalogId, this.getSummary());
                        // log.info(`Starting import for catalog ${catalogId} (${catalog.settings.type}) with transaction timestamp ${transactionTimestamp}`);
                        log.info(`Starting import for catalog ${catalogId} (${catalog.settings.type}) with source ${this.getSettings().sourceURL}`);

                        // TODO currently this relies on "sourceURL" instead of transactionTimestamp
                        // should this be changed to transactionTimestamp?
                        // for that, we need to consider how to handle "deleted", i.e. non-fetched, datasets

                        await catalog.process(this.getSettings().sourceURL, this.settings);
                    }
                    catch (e) {
                        log.error(`Error while importing into catalog ${catalogId}`, e);
                        this.getSummary().appErrors.push(`Error while importing into catalog ${catalogId}: ${e.message}`);
                    }
                }
                // await this.database.pushToElastic3ReturnOfTheJedi(this.elastic, this.settings.sourceURL);
                await this.postHarvestingHandling();
                observer.next(ImportResult.complete(this.summary));
            }
            catch (err) {
                if (err.message) {
                    this.summary.appErrors.push(err.message);
                }
                await this.database.rollbackTransaction();
                let msg = this.summary.appErrors.length > 0 ? this.summary.appErrors[0] : this.summary.databaseErrors[0];
                log.error(err);
                observer.next(ImportResult.complete(this.summary, msg));
            }
        }
        observer.complete();
    }

    protected abstract harvest(): Promise<number>;

    protected async postHarvestingHandling() {
        // For Profile specific Handling
    }

    getSettings(): S {
        return this.settings;
    }

    getSummary(): Summary {
        return this.summary;
    }
}
