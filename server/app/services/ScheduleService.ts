import {Service} from '@tsed/di';
import {ConfigService} from './config/ConfigService';
import {ImportSocketService} from '../sockets/import.socket.service';
import {CronJob, CronTime} from 'cron';
import {CronData} from '../importer.settings';
import {Moment} from "moment";

let log = require('log4js').getLogger(__filename);

@Service()
export class ScheduleService {

    // remember the scheduled jobs
    jobs: { [x: number]: CronJob } = {};

    constructor(private socketService: ImportSocketService) {

        this.initialize();

    }

    /**
     * Start all cron jobs configured in each harvester
     */
    initialize() {

        // activate scheduler for all harvester that have a cron pattern
        // but only run those immediately that actually are enabled
        ConfigService.get()
            .filter(config => config.cron && config.cron.active)
            .forEach(config => this.scheduleJob(config.id, config.cron.pattern, !config.disable));

    }

    /**
     * Save a cronjob and activate scheduler.
     * @param id
     * @param cron
     */
    set(id: number, cron: CronData): Date {

        // update cron pattern in configuration
        let configData = ConfigService.get().filter(config => config.id === id)[0];
        configData.cron = cron;
        ConfigService.update(id, configData);

        // set up cron job if harvester is enabled and cron active
        const schedulingIsActive = !configData.disable && cron.active;
        if (schedulingIsActive) {
            this.scheduleJob(id, cron.pattern, !configData.disable);
            let cronJob = new CronJob(cron.pattern, () => {}, null, false);
            return cronJob.nextDate().toDate();
        } else {
            this.stopJob(id);
            return null;
        }

    }

    /**
     * Run a cron job
     */
    private scheduleJob(id: number, cronExpression: string, startImmediately: boolean): void {
        this.stopJob(id);

        try {
            this.jobs[id] = new CronJob(cronExpression, () => {
                let generalSettings = ConfigService.getGeneralSettings();
                if (generalSettings.cronOffset) {
                    setTimeout(function(socketService, id){
                        socketService.runImport(id);
                    }, generalSettings.cronOffset*60*1000, this.socketService, id);
                }
                else {
                    this.socketService.runImport(id);
                }
            }, null, startImmediately, 'Europe/Berlin');


        } catch (e) {
            log.error('Could not schedule job with ID: ' + id, e);
        }

    }

    /**
     * Stop a cron job
     */
    stopJob(id: number) {

        if (this.jobs[id]) {
            this.jobs[id].stop();
            delete this.jobs[id];
        }

    }

    startJob(id: number) {

        if (this.jobs[id]) {
            this.jobs[id].start();
        } else {
            let config = ConfigService.get()
                .filter(config => config.id === id && config.cron && config.cron.active)[0];


                this.scheduleJob(id, config.cron.pattern, false);
            // log.error(`Job "${id}" could not be started.`);
        }

    }
}
