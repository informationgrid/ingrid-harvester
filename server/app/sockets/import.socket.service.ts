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
import * as crypto from "crypto";
import log4js from 'log4js';
import pLimit from 'p-limit';
import * as SocketIO from 'socket.io';
import type { ImportLogMessage } from '../model/import.result.js';
import type { Importer } from '../importer/importer.js';
import { ProfileFactoryLoader } from '../profiles/profile.factory.loader.js';
import { ConfigService } from '../services/config/ConfigService.js';
import { SummaryService } from '../services/config/SummaryService.js';
import { JobsUtils } from '../statistic/jobs.utils.js';
import { StatisticUtils } from '../statistic/statistic.utils.js';
import { harvestLogContext } from '../utils/harvest-log-context.js';
import * as MiscUtils from '../utils/misc.utils.js';
import { MailServer } from '../utils/nodemailer.utils.js';

@SocketService('/import')
export class ImportSocketService {
    @Nsp nsp: Namespace;

    log = log4js.getLogger();

    readonly threadpoolSize = ConfigService.getThreadpoolSize();
    private limit = pLimit(this.threadpoolSize);
    private activeImportIds = new Set<number>();
    private cancelledJobs = new Set<string>();

    // throttling of messages to frontend to make UI more responsive
    private lastEmitTimes = new Map<number, number>();
    private static readonly THROTTLE_MS = 500;

    private activeJobs = new Map<number, { importer: { cancel(): void }; jobId: string }>();

    cancelImport(harvesterId: number, jobId: string): boolean {
        const entry = this.activeJobs.get(harvesterId);
        if (entry && entry.jobId === jobId) {
            entry.importer.cancel();
            const existing = this.summaryService.get(harvesterId);
            if (existing?.summary) {
                const cancellingMsg: ImportLogMessage = { ...existing, id: harvesterId, jobId, complete: false, cancelling: true, status: 'importing' };
                this.summaryService.setInProgress(cancellingMsg);
                this.nsp.emit('/log', cancellingMsg);
            } else {
                const cancellingMsg: ImportLogMessage = { id: harvesterId, jobId, complete: false, cancelling: true, stage: '' };
                this.summaryService.setInProgress(cancellingMsg);
                this.nsp.emit('/log', cancellingMsg);
            }
            return true;
        }

        const liveState = this.summaryService.getLiveStates().find(t => t.id === harvesterId);
        if (liveState?.jobId === jobId && liveState?.status === 'queued') {
            this.cancelledJobs.add(jobId);
            this.summaryService.clearLiveState(harvesterId);
            this.nsp.emit('/log', { id: harvesterId, jobId, complete: true, status: 'cancelled', stage: '' });
            return true;
        }

        return false;
    }

    constructor(private summaryService: SummaryService) {
    }

    /**
     * Triggered when a new client connects to the Namespace.
     */
    $onConnection(@Socket socket: Socket, @SocketSession session: SocketSession) {
        this.log.info('SOCKETIO: A client is connected');
        for (const msg of this.summaryService.getLiveStates()) {
            socket.emit('/log', msg);
        }
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
        if (this.activeImportIds.has(id)) return;
        this.activeImportIds.add(id);

        const jobId = crypto.randomUUID();

        if (this.activeImportIds.size >= this.threadpoolSize) {
            const queuedMsg: ImportLogMessage = { id, jobId, status: 'queued', stage: '' };
            this.summaryService.setLiveState(id, queuedMsg);
            this.nsp.emit('/log', queuedMsg);
        } else {
            this.summaryService.clearLiveState(id);
        }

        return this.limit(() => new Promise<void>((resolve) => {
            const done = () => { this.activeImportIds.delete(id); resolve(); };

            if (this.cancelledJobs.has(jobId)) {
                this.cancelledJobs.delete(jobId);
                this.summaryService.clearLiveState(id);
                this.nsp.emit('/log', { id, jobId, complete: true, status: 'cancelled', stage: '' });
                done();
                return;
            }

            try {
                let lastExecution = new Date();
                let configGeneral = ConfigService.getGeneralSettings();
                let configData = ConfigService.getHarvesters().filter(config => config.id === id)[0];
                //configData.deduplicationAlias = configData.index + 'dedup';

                let configHarvester = MiscUtils.merge(configData, configGeneral);

                let profile = ProfileFactoryLoader.get();
                let cancelBeforeStart = false;
                this.activeJobs.set(id, { importer: { cancel: () => { cancelBeforeStart = true; } }, jobId });
                const startingMsg: ImportLogMessage = { id, jobId, complete: false, stage: 'starting', lastExecution, status: 'importing' };
                this.summaryService.setInProgress(startingMsg);
                this.nsp.emit('/log', startingMsg);
                profile.getImporter(configHarvester).then(importer => {
                    if (cancelBeforeStart) importer.cancel();
                    this.activeJobs.set(id, { importer, jobId });
                    let mode = isIncremental ? 'incr' : 'full';
                    this.log.info(`>> Running importer: [${configHarvester.type}] ${configHarvester.description}`);
                    harvestLogContext.run({ harvesterId: id, jobId }, () => {
                        importer.run(isIncremental).subscribe({
                            next: response => {
                                response.id = id;
                                response.jobId = jobId;
                                response.lastExecution = lastExecution;
                                if (configHarvester.cron?.[mode]?.active) {
                                    response.nextExecution = new CronJob(configHarvester.cron[mode].pattern, () => {
                                    }).nextDate().toDate();
                                }
                                response.duration = (new Date().getTime() - lastExecution.getTime()) / 1000;

                                const now = Date.now();
                                const lastEmit = this.lastEmitTimes.get(id) || 0;
                                if (response.complete || (now - lastEmit > ImportSocketService.THROTTLE_MS)) {
                                    this.nsp.emit('/log', response);
                                    this.lastEmitTimes.set(id, now);
                                    this.summaryService.update(response);
                                }

                                // when complete then write information log to file
                                if (response.complete) {
                                    this.summaryService.clearLiveState(id);
                                    this.lastEmitTimes.delete(id);
                                    // save old summary to compare
                                    let summaryLastRun: ImportLogMessage = this.summaryService.get(id);

                                    // TODO this must be done for each catalog - by the importer?
                                    importer.summary.print(this.log);
                                    this.summaryService.update(response);
                                    let statisticUtils = new StatisticUtils();
                                    for (const catalogId of configHarvester.catalogIds) {
                                        statisticUtils.saveSummary(response, catalogId);
                                    }
                                    new JobsUtils().saveJob(response, null, importer.stageSummaries);

                                    // when less results send mail
                                    if (!isIncremental && configGeneral.mail.enabled && configGeneral.harvesting.mail.enabled) {
                                        let importedLastRun = (summaryLastRun) ? summaryLastRun.summary.numDocs - summaryLastRun.summary.skippedDocs.length : 0;
                                        let imported = importer.summary.numDocs - importer.summary.skippedDocs.length;
                                        let diff = configGeneral.harvesting.mail.minDifference ?? 10;
                                        if (importedLastRun * (100 - diff) / 100 >= imported) {
                                            let subject: string;
                                            if (imported === 0)
                                                subject = `Importer [${configHarvester.type}] "${configData.description}" ohne Ergebnisse!`;
                                            else
                                                subject = `Importer [${configHarvester.type}] "${configData.description}" mit weniger Ergebnissen!`;
                                            let text = `Current Run:\n`
                                                + importer.summary.toString();
                                            if (summaryLastRun) {
                                                text += `\n\n`
                                                    + `Last Run (`+summaryLastRun.lastExecution+`):\n`
                                                    + summaryLastRun.summary.toString();
                                            }
                                            MailServer.getInstance().send(subject, text);
                                        }
                                    }
                                }
                            },
                            error: error => {
                                this.activeJobs.delete(id);
                                this.log.error('There was an error: ', error);
                                if (configGeneral.mail.enabled) {
                                    MailServer.getInstance().send(`Importer [${configHarvester.type}] ${configData.description} failed`, error.toString());
                                }
                                this.summaryService.clearImport(id);
                                done();
                            },
                            complete: () => {
                                this.activeJobs.delete(id);
                                done();
                            }
                        });
                    });
                }).catch(e => {
                    this.activeJobs.delete(id);
                    this.log.error(`An error occured while harvesting (id=${id}): `, e);
                    this.summaryService.clearLiveState(id);
                    done();
                });
            }
            catch (e) {
                this.log.error(`An error occured while harvesting (id=${id}): `, e);
                this.summaryService.clearLiveState(id);
                done();
            }
        }));
    }
}
