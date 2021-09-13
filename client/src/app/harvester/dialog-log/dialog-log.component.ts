/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2021 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.1 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  http://ec.europa.eu/idabc/eupl5
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA} from "@angular/material/dialog";
import {ImportLogMessage} from "../../../../../server/app/model/import.result";

@Component({
  selector: 'app-dialog-log',
  templateUrl: './dialog-log.component.html',
  styleUrls: ['./dialog-log.component.scss']
})
export class DialogLogComponent implements OnInit {

  logText: string;
  appErrors: string[] = [];
  elasticSearchErrors: string[] = [];
  appWarnings: string[][] = [];

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    const message: ImportLogMessage = data.content;
    this.appErrors = message.summary.appErrors;
    this.elasticSearchErrors = message.summary.elasticErrors;
    this.appWarnings = message.summary.warnings;

  }

  ngOnInit() {
  }

  getInitialIndex() {
    if (this.appErrors.length > 0) {
      return 0;
    } else if (this.elasticSearchErrors.length > 0) {
      return 1;
    } else {
      return 2;
    }
  }
}
