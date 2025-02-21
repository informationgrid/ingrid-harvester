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

import { Emit, Input, Namespace, Nsp, Socket, SocketService, SocketSession } from '@tsed/socketio';
import { CronJob } from 'cron';
import { getLogger } from 'log4js';
import * as SocketIO from 'socket.io';
import { ImportLogMessage } from '../model/import.result';
import { ElasticsearchFactory } from '../persistence/elastic.factory';
import { ProfileFactoryLoader } from '../profiles/profile.factory.loader';
import { ConfigService } from '../services/config/ConfigService';
import { SummaryService } from '../services/config/SummaryService';
import { StatisticUtils } from '../statistic/statistic.utils';
import * as MiscUtils from '../utils/misc.utils';
import { MailServer } from '../utils/nodemailer.utils';

@SocketService('/import')
export class ImportSocketService {
    @Nsp nsp: Namespace;

    log = getLogger();

    constructor(private summaryService: SummaryService) {
    }

    /**
     * Triggered when a new client connects to the Namespace.
     */
    $onConnection(@Socket socket: Socket, @SocketSession session: SocketSession) {
        this.log.info('SOCKETIO: A client is connected');
    }

    /**
     * Triggered when a client disconnects from the Namespace.
     */
    $onDisconnect(@Socket socket: SocketIO.Socket) {
        this.log.info('SOCKETIO: A client disconnected');
    }

    @Input('runImport')
    @Emit('/log')
    async runImport(id: number, isIncremental?: boolean): Promise<void> {
        try {
            let lastExecution = new Date();
            let configGeneral = ConfigService.getGeneralSettings();
            let configData = ConfigService.get().filter(config => config.id === id)[0];
            //configData.deduplicationAlias = configData.index + 'dedup';

            let configHarvester = MiscUtils.merge(configData, configGeneral, { isIncremental });

            let profile = ProfileFactoryLoader.get();
            if (profile.useIndexPerCatalog()) {
                profile.createCatalogIfNotExist(configHarvester.catalogId);
            }
            let importer = await profile.getImporterFactory().get(configHarvester);
            let mode = isIncremental ? 'incr' : 'full';
            this.log.info(`>> Running importer: [${configHarvester.type}] ${configHarvester.description}`);

            importer.run.subscribe(response => {
                response.id = id;
                response.lastExecution = lastExecution;
                if (configHarvester.cron?.[mode]?.active) {
                    response.nextExecution = new CronJob(configHarvester.cron[mode].pattern, () => {
                    }).nextDate().toDate();
                }
                response.duration = (new Date().getTime() - lastExecution.getTime()) / 1000;
                this.nsp.emit('/log', response);

                // when complete then write information log to file
                if (response.complete) {
                    // save old summary to compare
                    let summaryLastRun: ImportLogMessage = this.summaryService.get(id);

                    importer.getSummary().print(this.log);
                    this.summaryService.update(response);
                    let statisticUtils = new StatisticUtils(configGeneral);
                    let elastic = ElasticsearchFactory.getElasticUtils(configGeneral.elasticsearch, null);
                    let index = profile.useIndexPerCatalog() ? configHarvester.catalogId : elastic.indexName;
                    statisticUtils.saveSummary(response, index);

                    // when less results send mail
                    if (!isIncremental && configGeneral.mail.enabled && configGeneral.harvesting.mail.enabled) {
                        let importedLastRun = (summaryLastRun) ? summaryLastRun.summary.numDocs - summaryLastRun.summary.skippedDocs.length : 0;
                        let imported = importer.getSummary().numDocs - importer.getSummary().skippedDocs.length;
                        let diff = configGeneral.harvesting.mail.minDifference ?? 10;
                        if (importedLastRun * (100 - diff) / 100 >= imported) {
                            let subject: string;
                            if (imported === 0)
                                subject = `Importer [${configHarvester.type}] "${configData.description}" ohne Ergebnisse!`;
                            else
                                subject = `Importer [${configHarvester.type}] "${configData.description}" mit weniger Ergebnissen!`;
                            let text = `Current Run:\n`
                                + importer.getSummary().toString();
                            if (summaryLastRun) {
                                text += `\n\n`
                                    + `Last Run (`+summaryLastRun.lastExecution+`):\n`
                                    + summaryLastRun.summary.toString();
                            }
                            MailServer.getInstance().send(subject, text);
                        }
                    }
                }
            }, error => {
                this.log.error('There was an error: ', error);
                if (configGeneral.mail.enabled) {
                    MailServer.getInstance().send(`Importer [${configHarvester.type}] ${configData.description} failed`, error.toString());
                }
            });
        }
        catch (e) {
            this.log.error(`An error occured while harvesting (id=${id}): `, e);
        }
    }
}
