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

import { isValidCron } from 'cron-validator';
import { Component, Inject, OnInit, Optional } from '@angular/core';
import { CronData } from '../../../../../server/app/importer.settings';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';

@Component({
  selector: 'app-dialog-scheduler',
  templateUrl: './dialog-scheduler.component.html',
  styleUrls: ['./dialog-scheduler.component.scss']
})
export class DialogSchedulerComponent implements OnInit {

  schedulerForm: UntypedFormGroup;

  harvesterType: string;

  constructor(
    private formBuilder: UntypedFormBuilder, 
    @Optional() @Inject(MAT_DIALOG_DATA) public data: { harvesterType: string, cron: { full: CronData, incr: CronData } }
  ) {
    if (!data.cron) {
      data.cron = {
        "full": {
          "pattern": "",
          "active": false
        },
        "incr": {
          "pattern": "",
          "active": false
        }
      };
    }

    this.harvesterType = data.harvesterType;
    this.schedulerForm = this.formBuilder.group({
      full: this.formBuilder.group({
        pattern: [data.cron.full.pattern],
        active: [data.cron.full.active]
      }),
      incr: this.formBuilder.group({
        pattern: [data.cron.incr.pattern],
        active: [data.cron.incr.active]
      }),
    })

  }

  ngOnInit(): void {}
  
  validationCheck(expression: string){
    return !isValidCron(expression)
  }

}
