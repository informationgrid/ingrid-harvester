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

  private socket: io.Socket;

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
