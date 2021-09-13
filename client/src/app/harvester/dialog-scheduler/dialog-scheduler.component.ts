/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2021 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
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

import {Component, Inject, OnInit, Optional} from '@angular/core';
import cronstrue from 'cronstrue/i18n';
import {MAT_DIALOG_DATA} from '@angular/material';
import {CronData} from '../../../../../server/app/importer.settings';

@Component({
  selector: 'app-dialog-scheduler',
  templateUrl: './dialog-scheduler.component.html',
  styleUrls: ['./dialog-scheduler.component.scss']
})
export class DialogSchedulerComponent implements OnInit {
  cronTranslation: string;
  validExpression = true;
  showInfo = false;

  constructor(@Optional() @Inject(MAT_DIALOG_DATA) public cron: CronData) {
  }

  ngOnInit(): void {
    this.translate(this.cron.pattern);
  }

  translate(cronExpression: string) {
    try {
      this.cronTranslation = cronstrue.toString(cronExpression, {locale: 'de'});
      this.validExpression = true;
    } catch (e) {
      this.cronTranslation = 'Kein gültiger Ausdruck';
      this.validExpression = false;
    }

    if (!this.cron.active) {
      this.cronTranslation = 'Planung ausgeschaltet';
      return;
    }
  }

  clearInput() {
    this.cron.pattern = '';
    this.translate('');
  }
}
