import {Service} from '@tsed/di';
import {ConfigService} from './config/ConfigService';
import {ImportSocketService} from '../sockets/import.socket.service';
import {CronJob} from 'cron';

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
            .filter(config => config.cronPattern && config.cronPattern.length > 0)
            .forEach(config => this.scheduleJob(config.id, config.cronPattern, !config.disable));

    }

    /**
     * Save a cronjob and activate scheduler.
     * @param id
     * @param cronExpression
     */
    set(id: number, cronExpression: string): void {

        // update cron pattern in configuration
        let configData = ConfigService.get().filter(config => config.id === id)[0];
        configData.cronPattern = cronExpression;
        ConfigService.update(id, configData);

        // set up cron job if harvester is enabled
        if (cronExpression !== null) {
            this.scheduleJob(id, cronExpression, !configData.disable);
        } else {
            this.stopJob(id);
        }

    }

    /**
     * Run a cron job
     */
    private scheduleJob(id: number, cronExpression: string, startImmediately: boolean): void {

        try {
            this.jobs[id] = new CronJob(cronExpression, () => {
                this.socketService.runImport(id);
            }, null, startImmediately, 'Europe/Berlin');
        } catch (e) {
            log.error('Could not schedule job with ID: ' + id, e);
        }

    }

    /**
     * Stop a cron job
     */
    stopJob(id: number) {

        this.jobs[id] && this.jobs[id].stop();

    }

    startJob(id: number) {

        if (this.jobs[id]) {
            this.jobs[id].start();
        } else {
            let config = ConfigService.get()
                .filter(config => config.id === id && config.cronPattern && config.cronPattern.length > 0)[0];

            if (config) {
                this.scheduleJob(id, config.cronPattern, false);
            }
            // log.error(`Job "${id}" could not be started.`);
        }

    }
}
