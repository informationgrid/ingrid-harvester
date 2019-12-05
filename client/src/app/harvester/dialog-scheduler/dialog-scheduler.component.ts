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

}
