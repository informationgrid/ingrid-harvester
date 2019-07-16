import {Service} from '@tsed/di';
import {ConfigService} from './config/ConfigService';
import {ImportSocketService} from '../sockets/import.socket.service';
import {CronJob} from 'cron';


@Service()
export class ScheduleService {

    //
    jobs: { [x: number]: CronJob } = {};

    constructor(private socketService: ImportSocketService) {
        this.initialize();
    }

    /**
     * Start all cron jobs configured in each harvester
     */
    initialize() {

        ConfigService.get()
            .filter(config => config.cronPattern && config.cronPattern.length > 0)
            .forEach(config => this.runJob(config.id, config.cronPattern));

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

        // set up cron job
        this.runJob(id, cronExpression);

    }

    /**
     * Run a cron job
     */
    private runJob(id: number, cronExpression: string): void {

        this.jobs[id] = new CronJob(cronExpression, () => {
            this.socketService.runImport(id);
        }, null, true, 'Europe/Berlin');

    }

    /**
     * Stop a cron job
     */
    stopJob(id: number) {
        this.jobs[id] && this.jobs[id].stop();
    }
}
