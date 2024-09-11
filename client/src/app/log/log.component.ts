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
