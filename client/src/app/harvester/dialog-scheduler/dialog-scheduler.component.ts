import {Component, Inject, OnInit, SimpleChanges} from '@angular/core';
import cronstrue from 'cronstrue/i18n';
import {MAT_DIALOG_DATA} from '@angular/material';

@Component({
  selector: 'app-dialog-scheduler',
  templateUrl: './dialog-scheduler.component.html',
  styleUrls: ['./dialog-scheduler.component.scss']
})
export class DialogSchedulerComponent implements OnInit {
  cronTranslation: string;
  cronValue = '';
  validExpression = true;
  showInfo = false;


  constructor(@Inject(MAT_DIALOG_DATA) public data) {
    if (data) {
      this.cronValue = data;
    }
  }

  ngOnInit(): void {
    this.translate(this.cronValue);
  }

  translate(cronExpression: string) {
    try {
      this.cronTranslation = cronstrue.toString(cronExpression, {locale: 'de'});
      this.validExpression = true;
    } catch (e) {
      this.cronTranslation = 'Kein gültiger Ausdruck';
      this.validExpression = false;
    }
  }

}
