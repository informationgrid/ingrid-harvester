import {Emit, Input, Namespace, Nsp, Socket, SocketService, SocketSession} from '@tsed/socketio';
import * as SocketIO from 'socket.io';
import {ConfigService} from '../services/config/ConfigService';
import {ImporterFactory} from '../importer/importer.factory';
import {SummaryService} from '../services/config/SummaryService';
import {CronJob} from 'cron';
import {getLogger} from 'log4js';

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
    runImport(id: number): Promise<null> {
        return new Promise(resolve => {

            let lastExecution = new Date();
            let configGeneral = ConfigService.getGeneralSettings();
            let configData = ConfigService.get().filter(config => config.id === id)[0];
            configData.deduplicationAlias = configData.index + 'dedup';

            let configHarvester = {...configData, ...configGeneral};

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
                        importer.getSummary().print(this.log);
                        this.summaryService.update(response);
                        resolve();
                    }
                }, error => {
                    console.error('There was an error:', error);
                });
            } catch (e) {
                console.error('An error: ', e);
            }

        });
    }
}
