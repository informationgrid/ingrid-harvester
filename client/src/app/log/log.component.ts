import { Component, OnInit } from '@angular/core';
import {Socket} from 'ngx-socket-io';

@Component({
  selector: 'app-log',
  templateUrl: './log.component.html',
  styleUrls: ['./log.component.scss']
})
export class LogComponent implements OnInit {

  importInfo = this.socket.fromEvent<any>('/log');

  constructor(private socket: Socket) { }

  ngOnInit() {
    this.importInfo.subscribe(data => {
      console.log('Received from socket: ', data);
      // this.importDetail[data.id] = data;
    });
  }

}
