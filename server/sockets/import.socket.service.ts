import {Emit, Input, Namespace, Nsp, Socket, SocketService, SocketSession} from "@tsed/socketio";
import * as SocketIO from "socket.io";
import {ConfigService} from "../services/config/ConfigService";
import {ImporterFactory} from "../importer/importer.factory";

@SocketService('/import')
export class ImportSocketService {
    @Nsp nsp: Namespace;

    /**
     * Triggered when a new client connects to the Namespace.
     */
    $onConnection(@Socket socket: Socket, @SocketSession session: SocketSession) {
        console.log('SOCKETIO: on connection');
    }

    /**
     * Triggered when a client disconnects from the Namespace.
     */
    $onDisconnect(@Socket socket: SocketIO.Socket) {
        console.log('SOCKETIO: on disconnect');
    }

    @Input('runImport')
    @Emit('/log')
    runImport(id: number) {
        console.log('in runImport()');
        let lastExecution = new Date();
        let configData = ConfigService.get().filter(config => config.id === id)[0];
        configData.deduplicationAlias = configData.index + 'dedup';

        let importer = ImporterFactory.get(configData);

        importer.run.subscribe( response => {
            // if (response.complete) {
            //     response.summary.print();
            // } else {
                response.id = id;
                response.lastExecution = lastExecution;
                response.duration = (new Date().getTime() - lastExecution.getTime())/1000;
                this.nsp.emit('/log', response);
            // }
        }, error => {
            console.error('There was an error:', error);
        });
    }
}
