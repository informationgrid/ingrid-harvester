import {Component, OnInit, ViewChild} from '@angular/core';
import {LogService} from './log.service';
import {CdkVirtualScrollViewport} from '@angular/cdk/scrolling';

@Component({
  selector: 'app-log',
  templateUrl: './log.component.html',
  styleUrls: ['./log.component.scss']
})
export class LogComponent implements OnInit {
  logdata = [];

  @ViewChild(CdkVirtualScrollViewport, {static: false}) viewPort: CdkVirtualScrollViewport;
  isLoading = true;

  constructor(private logService: LogService) {
  }

  ngOnInit() {

    this.logService.getLog().subscribe(data => {
      this.logdata = data.split('\n');
      this.isLoading = false;

      // wait for content to be rendered
      setTimeout(() => {
        this.viewPort.scrollToIndex(this.logdata.length);
      }, 0);

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
