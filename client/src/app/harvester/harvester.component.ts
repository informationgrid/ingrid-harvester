import { Component, OnInit } from '@angular/core';
import {HarvesterService} from "./harvester.service";
import {Observable} from "rxjs";
import {Harvester} from "./model/harvester";
import {MatDialog} from "@angular/material";
import {DialogSchedulerComponent} from "./dialog-scheduler/dialog-scheduler.component";
import {DialogLogComponent} from "./dialog-log/dialog-log.component";
import {DialogEditComponent} from "./dialog-edit/dialog-edit.component";

@Component({
  selector: 'app-harvester',
  templateUrl: './harvester.component.html',
  styleUrls: ['./harvester.component.scss']
})
export class HarvesterComponent implements OnInit {

  harvesters: Observable<Harvester[]>;

  constructor(public dialog: MatDialog, private harvesterService: HarvesterService) { }

  ngOnInit() {
    this.harvesters = this.harvesterService.getHarvester();
  }

  schedule(id: string) {
    const dialogRef = this.dialog.open(DialogSchedulerComponent, {
      width: '900px'
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      // this.animal = result;
    });
  }

  showLog(id: string) {
    const dialogRef = this.dialog.open(DialogLogComponent, {
      width: '900px'
    });
  }

  startImport(id: string) {

  }

  edit(id: string) {
    const dialogRef = this.dialog.open(DialogEditComponent, {
      width: '900px'
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      // this.animal = result;
    });
  }
}
