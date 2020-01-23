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
