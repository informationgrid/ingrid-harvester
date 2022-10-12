/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2022 wemove digital solutions GmbH
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

import {Service} from '@tsed/di';
import {ConfigService} from './config/ConfigService';
import {ImportSocketService} from '../sockets/import.socket.service';
import {CronJob, CronTime} from 'cron';
import {CronData} from '../importer.settings';
import {Moment} from "moment";
import {UrlCheckService} from "./statistic/UrlCheckService";
import {IndexCheckService} from "./statistic/IndexCheckService";
import {IndexService} from "./IndexService";

let log = require('log4js').getLogger(__filename);

@Service()
export class ScheduleService {

    // remember the scheduled jobs
    jobs: { [x: number]: { [mode: string]: CronJob }} = {};
    urlCheckJob : CronJob;
    indexCheckJob : CronJob;

    indexBackupJob : CronJob;

    constructor(private socketService: ImportSocketService, private urlCheckService: UrlCheckService, private indexCheckService: IndexCheckService, private indexService: IndexService) {

        this.initialize();

    }

    /**
     * Start all cron jobs configured in each harvester
     */
    initialize() {

        // activate scheduler for all harvester that have a cron pattern
        // but only run those immediately that actually are enabled
        ConfigService.get()
            .forEach(config => {
                for (let mode of <('full' | 'incr')[]>['full', 'incr']) {
                    if (config.cron?.[mode]?.active) {
                        this.scheduleJob(config.id, mode, config.cron[mode].pattern, !config.disable);
                    }
                }
            });

        this.setUrlCheck(ConfigService.getGeneralSettings().urlCheck);
        this.setIndexCheck(ConfigService.getGeneralSettings().indexCheck);
        this.setIndexBackup(ConfigService.getGeneralSettings().indexBackup);

    }

    /**
     * Save a cronjob and activate scheduler.
     * @param id
     * @param cron
     */
    set(id: number, cron: { full: CronData, incr: CronData }): Date[] {

        // update cron pattern in configuration
        let configData = ConfigService.get().filter(config => config.id === id)[0];
        configData.cron = cron;
        ConfigService.update(id, configData);

        let dates = [];
        for (let mode of <('full' | 'incr')[]>['full', 'incr']) {
            // set up cron job if harvester is enabled and cron active
            const schedulingIsActive = !configData.disable && cron[mode]?.active;
            if (schedulingIsActive) {
                this.scheduleJob(id, mode, cron[mode].pattern, !configData.disable);
                let cronJob = new CronJob(cron[mode].pattern, () => {}, null, false);
                dates.push(cronJob.nextDate().toDate());
            } else {
                this.stopJob(id, mode);
                dates.push(null);
            }
        }
        return dates;
    }

    /**
     * Run a cron job
     */
    private scheduleJob(id: number, mode: 'full' | 'incr', cronExpression: string, startImmediately: boolean): void {
        this.stopJob(id, mode);

        try {
            if (!this.jobs[id]) {
              this.jobs[id] = {};  
            }
            this.jobs[id][mode] = new CronJob(cronExpression, () => {
                let generalSettings = ConfigService.getGeneralSettings();
                if (generalSettings.cronOffset) {
                    setTimeout(function(socketService, id){
                        socketService.runImport(id, mode == 'incr');
                    }, generalSettings.cronOffset*60*1000, this.socketService, id);
                }
                else {
                    this.socketService.runImport(id, mode == 'incr');
                }
            }, null, startImmediately, 'Europe/Berlin');


        } catch (e) {
            log.error('Could not schedule job with ID: ' + id, e);
        }

    }

    /**
     * Stop a cron job
     */
    stopJob(id: number, mode: 'full' | 'incr') {

        if (this.jobs[id]?.[mode]) {
            this.jobs[id][mode]?.stop();
            delete this.jobs[id][mode];
        }

    }

    startJob(id: number, mode: 'full' | 'incr') {

        if (this.jobs[id][mode]) {
            this.jobs[id][mode].start();
        } else {
            let config = ConfigService.get().filter(config => config.id === id && config.cron?.[mode] && config.cron[mode].active)[0];
            this.scheduleJob(id, mode, config.cron[mode].pattern, false);
            // log.error(`Job "${id}" could not be started.`);
        }
    }



    /**
     * Save a cronjob and activate scheduler.
     * @param cron
     */
    setUrlCheck(cron: CronData): Date {
        // set up cron job if harvester is enabled and cron active
        const schedulingIsActive = cron.active;
        if (schedulingIsActive) {
            this.scheduleUrlCheckJob(cron.pattern, true);
            let cronJob = new CronJob(cron.pattern, () => {}, null, false);
            return cronJob.nextDate().toDate();
        } else {
            this.stopUrlCheckJob();
            return null;
        }

    }

    /**
     * Run a cron job
     */
    private scheduleUrlCheckJob(cronExpression: string, startImmediately: boolean): void {
        this.stopUrlCheckJob();

        try {
            this.urlCheckJob = new CronJob(cronExpression, () => {
                let generalSettings = ConfigService.getGeneralSettings();
                if (generalSettings.cronOffset) {
                    setTimeout(function(urlCheckService){
                        urlCheckService.start();
                    }, generalSettings.cronOffset*60*1000, this.urlCheckService);
                }
                else {
                    this.urlCheckService.start();
                }
            }, null, startImmediately, 'Europe/Berlin');


        } catch (e) {
            log.error('Could not schedule UrlCheck job!', e);
        }

    }

    /**
     * Stop a cron job
     */
    stopUrlCheckJob() {

        if (this.urlCheckJob) {
            this.urlCheckJob.stop();
            delete this.urlCheckJob;
        }

    }

    startUrlCheckJob() {
        if (this.urlCheckJob) {
            this.urlCheckJob.start();
        } else {
            let config = ConfigService.getGeneralSettings();
            this.scheduleUrlCheckJob(config.urlCheck.pattern, false);
        }
    }



    /**
     * Save a cronjob and activate scheduler.
     * @param cron
     */
    setIndexCheck(cron: CronData): Date {
        // set up cron job if harvester is enabled and cron active
        const schedulingIsActive = cron.active;
        if (schedulingIsActive) {
            this.scheduleIndexCheckJob(cron.pattern, true);
            let cronJob = new CronJob(cron.pattern, () => {}, null, false);
            return cronJob.nextDate().toDate();
        } else {
            this.stopIndexCheckJob();
            return null;
        }

    }

    /**
     * Run a cron job
     */
    private scheduleIndexCheckJob(cronExpression: string, startImmediately: boolean): void {
        this.stopIndexCheckJob();

        try {
            this.indexCheckJob = new CronJob(cronExpression, () => {
                let generalSettings = ConfigService.getGeneralSettings();
                if (generalSettings.cronOffset) {
                    setTimeout(function(indexCheckService){
                        indexCheckService.start();
                    }, generalSettings.cronOffset*60*1000, this.indexCheckService);
                }
                else {
                    this.indexCheckService.start();
                }
            }, null, startImmediately, 'Europe/Berlin');


        } catch (e) {
            log.error('Could not schedule IndexCheck job!', e);
        }

    }

    /**
     * Stop a cron job
     */
    stopIndexCheckJob() {

        if (this.indexCheckJob) {
            this.indexCheckJob.stop();
            delete this.indexCheckJob;
        }

    }

    startIndexCheckJob() {
        if (this.indexCheckJob) {
            this.indexCheckJob.start();
        } else {
            let config = ConfigService.getGeneralSettings();
            this.scheduleIndexCheckJob(config.indexCheck.pattern, false);
        }
    }




    /**
     * Save a cronjob and activate scheduler.
     * @param cron
     */
    setIndexBackup(cron): Date {
        // set up cron job if harvester is enabled and cron active
        const schedulingIsActive = cron.active;
        if (schedulingIsActive) {
            this.scheduleIndexBackupJob(cron.cronPattern, true);
            let cronJob = new CronJob(cron.cronPattern, () => {}, null, false);
            return cronJob.nextDate().toDate();
        } else {
            this.stopIndexBackupJob();
            return null;
        }

    }

    /**
     * Run a cron job
     */
    private scheduleIndexBackupJob(cronExpression: string, startImmediately: boolean): void {
        this.stopIndexBackupJob();
        try {
            this.indexBackupJob = new CronJob(cronExpression, () => {
                let generalSettings = ConfigService.getGeneralSettings();
                this.indexService.saveIndices(generalSettings.indexBackup.indexPattern, generalSettings.indexBackup.dir);
            }, null, startImmediately, 'Europe/Berlin');
        } catch (e) {
            log.error('Could not schedule Index Backup job!', e);
        }

    }

    /**
     * Stop a cron job
     */
    stopIndexBackupJob() {

        if (this.indexBackupJob) {
            this.indexBackupJob.stop();
            delete this.indexBackupJob;
        }

    }
}
