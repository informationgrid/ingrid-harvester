import {Component, Inject, Input, OnInit} from '@angular/core';
import { MAT_DIALOG_DATA } from "@angular/material/dialog";

@Component({
  selector: 'app-dialog-log',
  templateUrl: './dialog-log.component.html',
  styleUrls: ['./dialog-log.component.scss']
})
export class DialogLogComponent implements OnInit {

  logText: string;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    this.logText = data.content;
  }

  ngOnInit() {
  }

}
