/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
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
import {MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA} from "@angular/material/legacy-dialog";
import {ImportLogMessage} from "../../../../../server/app/model/import.result";
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';

@Component({
  selector: 'app-dialog-log',
  templateUrl: './dialog-log.component.html',
  styleUrls: ['./dialog-log.component.scss']
})
export class DialogLogComponent implements OnInit {

  @ViewChild(CdkVirtualScrollViewport, {static: false})
  viewPort: CdkVirtualScrollViewport;

  appErrors: string[] = [];
  databaseErrors: string[] = [];
  elasticSearchErrors: string[] = [];
  appWarnings: string[][] = [];

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    const message: ImportLogMessage = data.content;
    this.appErrors = message.summary.appErrors;
    this.databaseErrors = message.summary.databaseErrors;
    this.elasticSearchErrors = message.summary.elasticErrors;
    this.appWarnings = message.summary.warnings;
  }

  ngOnInit() {
  }

  getInitialIndex() {
    if (this.appErrors.length > 0) {
      return 0;
    } else if (this.databaseErrors.length > 0) {
      return 1;
    } else if (this.elasticSearchErrors.length > 0) {
      return 2;
    } else {
      return 3;
    }
  }
}
