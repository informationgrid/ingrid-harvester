import {Component, Inject, OnInit} from '@angular/core';
import {Harvester} from '@shared/harvester';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';

@Component({
  selector: 'app-dialog-edit',
  templateUrl: './dialog-edit.component.html',
  styleUrls: ['./dialog-edit.component.scss']
})
export class DialogEditComponent implements OnInit {
  // @ts-ignore
  harvester: Harvester = {id: -1, disable: true};
  dialogTitle = 'Neuen Harvester anlegen';

  constructor(@Inject(MAT_DIALOG_DATA) public data: Harvester) {
    if (data) {
      this.harvester = data;
      if (data.id !== -1) {
        this.dialogTitle = 'Harvester bearbeiten';
      }
    }
  }

  ngOnInit() {

  }

}
