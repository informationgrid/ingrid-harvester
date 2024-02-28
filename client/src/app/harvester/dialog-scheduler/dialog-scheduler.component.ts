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

import {Component, Inject, OnInit, Optional} from '@angular/core';
import cronstrue from 'cronstrue/i18n';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {CronData} from '../../../../../server/app/importer.settings';
import { isValidCron } from 'cron-validator';
import { FormGroup, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-dialog-scheduler',
  templateUrl: './dialog-scheduler.component.html',
  styleUrls: ['./dialog-scheduler.component.scss']
})
export class DialogSchedulerComponent implements OnInit {

  full = {
    validExpression: true,
  };
  incr = {
    validExpression: true,
  }

  schedulerForm: UntypedFormGroup

  constructor(
    private formBuilder: UntypedFormBuilder, 
    @Optional() @Inject(MAT_DIALOG_DATA) public cron: { full: CronData, incr: CronData }
  ) {
    if (!cron.full) {
      cron.full = { pattern: '', active: false };
    }
    if (!cron.incr) {
      cron.incr = { pattern: '', active: false };
    }

    this.schedulerForm = this.formBuilder.group({
      full: this.formBuilder.group({
        pattern: [cron.full.pattern],
        active: [cron.full.active]
      }),
      incr: this.formBuilder.group({
        pattern: [cron.incr.pattern],
        active: [cron.incr.active]
      }),
    })

  }

  ngOnInit(): void {}
  
  validationCheck(expression: string){
    return !isValidCron(expression)
  }

}
