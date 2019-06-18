import {Component, Inject, OnInit} from '@angular/core';
import {Harvester} from '../model/harvester';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-dialog-edit',
  templateUrl: './dialog-edit.component.html',
  styleUrls: ['./dialog-edit.component.scss']
})
export class DialogEditComponent implements OnInit {
  harvester: Harvester;

  constructor(@Inject(MAT_DIALOG_DATA) public data: Harvester) {
    if (data) {
      this.harvester = data;
    }
  }

  ngOnInit() {

  }

}
