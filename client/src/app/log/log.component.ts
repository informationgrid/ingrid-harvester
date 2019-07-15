import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {Socket} from 'ngx-socket-io';
import {LogService} from './log.service';

@Component({
  selector: 'app-log',
  templateUrl: './log.component.html',
  styleUrls: ['./log.component.scss']
})
export class LogComponent implements OnInit {
  logdata = '';
  importInfo = this.socket.fromEvent<any>('/log');

  @ViewChild('logContent', {static: true}) private logContainer: ElementRef;
  isLoading = true;

  constructor(private socket: Socket, private logService: LogService) {
  }

  ngOnInit() {
    this.importInfo.subscribe(data => {
      console.log('Received from socket: ', data);
      // this.importDetail[data.id] = data;
    });

    this.logService.getLog().subscribe(data => {
      this.logdata = data;
      this.isLoading = false;

      // wait for content to be rendered
      setTimeout(() => {
        this.logContainer.nativeElement.scrollTop = this.logContainer.nativeElement.scrollHeight;
      }, 100);

    }, (error => console.error('Error getting log:', error)));
  }

  determineClass(line: string) {
    if (line.includes('[DEBUG]')) {
      return 'debug';
    } else if (line.includes('[WARN]')) {
      return 'warn';
    } else if (line.includes('[ERROR]')) {
      return 'error';
    } else {
      return 'info'
    }
  }
}
