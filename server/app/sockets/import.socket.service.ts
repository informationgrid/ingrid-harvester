/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2021 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

import {Emit, Input, Namespace, Nsp, Socket, SocketService, SocketSession} from '@tsed/socketio';
import * as SocketIO from 'socket.io';
import {ConfigService} from '../services/config/ConfigService';
import {ImporterFactory} from '../importer/importer.factory';
import {SummaryService} from '../services/config/SummaryService';
import {CronJob} from 'cron';
import {getLogger} from 'log4js';
import {Mail, MailServer} from "../utils/nodemailer.utils";
import {ImportLogMessage} from "../model/import.result";
import {StatisticUtils} from "../statistic/statistic.utils";

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
        console.log('SOCKETIO: A client is connected');
    }

    /**
     * Triggered when a client disconnects from the Namespace.
     */
    $onDisconnect(@Socket socket: SocketIO.Socket) {
        console.log('SOCKETIO: A client disconnected');
    }

    @Input('runImport')
    @Emit('/log')
    runImport(id: number, isIncremental?: boolean, isConcurrent?: boolean): Promise<void> {
        return new Promise(resolve => {

            let lastExecution = new Date();
            let configGeneral = ConfigService.getGeneralSettings();
            let configData = ConfigService.get().filter(config => config.id === id)[0];
            configData.deduplicationAlias = configData.index + 'dedup';

            let configHarvester = {...configData, ...configGeneral, isIncremental, isConcurrent};

            let importer = ImporterFactory.get(configHarvester);
            this.log.info('>> Running importer: ' + configHarvester.description);

            try {
                importer.run.subscribe(response => {
                    response.id = id;
                    response.lastExecution = lastExecution;
                    if (configHarvester.cron && configHarvester.cron.active) {
                        response.nextExecution = new CronJob(configHarvester.cron.pattern, () => {
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
                        statisticUtils.saveSummary(response, configHarvester.index);

                        // when less results send mail
                        let importedLastRun = (summaryLastRun) ? summaryLastRun.summary.numDocs - summaryLastRun.summary.skippedDocs.length : 0;
                        let imported = importer.getSummary().numDocs - importer.getSummary().skippedDocs.length;
                        let maxDiff = (configGeneral.maxDiff) ? configGeneral.maxDiff : 10;
                        if ((importedLastRun - (importedLastRun*maxDiff/100) >= imported) || (imported === 0)) {
                            let subject: string;
                            if (imported === 0)
                                subject = `Importer "${configData.description}" ohne Ergebnisse!`;
                            else
                                subject = `Importer "${configData.description}" mit weniger Ergebnissen!`;
                            let text = `Current Run:\n`
                                + importer.getSummary().toString();
                            if (summaryLastRun) {
                                text += `\n\n`
                                    + `Last Run (`+summaryLastRun.lastExecution+`):\n`
                                    + summaryLastRun.summary.toString();
                            }
                            MailServer.getInstance().send(subject, text);
                        }

                        resolve();
                    }
                }, error => {
                    console.error('There was an error:', error);

                    MailServer.getInstance().send(`Importer ${configData.description} failed`, error.toString());
                });
            } catch (e) {
                console.error('An error: ', e);
            }

        });
    }
}
