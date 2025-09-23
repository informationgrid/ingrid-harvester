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

import {Component, Inject, OnInit, ViewChild} from '@angular/core';
import {MAT_DIALOG_DATA} from "@angular/material/dialog";
import {ImportLogMessage} from "../../../../../server/app/model/import.result";
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import {LogService} from "../../log/log.service";

@Component({
    selector: 'app-dialog-log',
    templateUrl: './dialog-log.component.html',
    styleUrls: ['./dialog-log.component.scss'],
    standalone: false
})
export class DialogLogComponent implements OnInit {

  @ViewChild(CdkVirtualScrollViewport, {static: false})
  viewPort: CdkVirtualScrollViewport;

  appErrors: string[] = [];
  databaseErrors: string[] = [];
  elasticsearchErrors: string[] = [];
  appWarnings: string[][] = [];
  harvesterID: string;
  logdata = [];
  isLoading = true;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any, private logService: LogService) {
    const message: ImportLogMessage = data.content;
    this.harvesterID = data.content.id;
    this.appErrors = message.summary.appErrors;
    this.databaseErrors = message.summary.databaseErrors;
    this.elasticsearchErrors = message.summary.elasticErrors;
    this.appWarnings = message.summary.warnings;
    console.log("Harvester ID",  data)
  }

  ngOnInit() {
    this.logService.getLogByHarvesterID(this.harvesterID).subscribe(data => {
      this.logdata = data.split('\n');
      this.isLoading = false;

      // wait for content to be rendered
      setTimeout(() => {
        this.viewPort.scrollToIndex(this.logdata.length);
      }, 0);

    }, (error => console.error('Error getting log:', error)));
  }

  getInitialIndex() {
    if (this.appErrors.length > 0) {
      return 0;
    } else if (this.databaseErrors.length > 0) {
      return 1;
    } else if (this.elasticsearchErrors.length > 0) {
      return 2;
    } else {
      return 3;
    }
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
