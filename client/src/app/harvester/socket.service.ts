import { Injectable } from '@angular/core';
import * as io from 'socket.io-client';
import {ConfigService} from '../config.service';
import {Subject} from 'rxjs';
import {ImportLogMessage} from '../../../../server/app/model/import.result';

@Injectable({
  providedIn: 'root'
})
export class SocketService {

  connectionLost$ = new Subject<boolean>();

  private socket: SocketIOClient.Socket;

  log$ = new Subject<ImportLogMessage>();

  constructor(private configService: ConfigService) {
    if (configService.config) {
      this.socket = io.connect(configService.config.url + '/import', {
        path: configService.config.contextPath + '/socket.io'
      });

      this.socket.on('/log', data => this.log$.next(data));

      this.socket.on('connect_failed', () => {
        console.error('Sorry, there seems to be an issue with the connection!');
      });
      this.socket.on('connect', () => {
        console.log('Connected to server via websocket');
        this.connectionLost$.next(false);
      });
      this.socket.on('error', (error) => {
        console.error('A websocket error occurred', error);
      });
      this.socket.on('connect_error', (error) => {
        console.error('A connection error occurred to: ' + configService.config.url + '/import');
        this.connectionLost$.next(true);
      });
    }
  }
}
