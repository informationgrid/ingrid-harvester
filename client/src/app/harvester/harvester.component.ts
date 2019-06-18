import { Component, OnInit } from '@angular/core';
import {HarvesterService} from "./harvester.service";
import {Observable} from "rxjs";
import {Harvester} from "./model/harvester";
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import {DialogSchedulerComponent} from "./dialog-scheduler/dialog-scheduler.component";
import {DialogLogComponent} from "./dialog-log/dialog-log.component";
import {DialogEditComponent} from "./dialog-edit/dialog-edit.component";
import {ImportNotifyComponent} from "./notifications/import-notify.component";
import {Socket} from 'ngx-socket-io';
import {ImportLogMessage} from "../../../../server/model/import.result";

@Component({
  selector: 'app-harvester',
  templateUrl: './harvester.component.html',
  styleUrls: ['./harvester.component.scss']
})
export class HarvesterComponent implements OnInit {

  harvesters: Observable<Harvester[]>;

  importInfo = this.socket.fromEvent<ImportLogMessage>('/log');

  importDetail: { [x: number]: ImportLogMessage } = {};

  constructor(private socket: Socket, public dialog: MatDialog, private snackBar: MatSnackBar, private harvesterService: HarvesterService) { }

  ngOnInit() {

    this.importInfo.subscribe(data => {
      console.log('Received from socket: ', data);
      this.importDetail[data.id] = data;
    });

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
      width: '900px',
      data: {
        content: 'xxx'
      }
    });
  }

  startImport(id: string) {

    this.harvesterService.runImport(id).subscribe();

    this.snackBar.openFromComponent(ImportNotifyComponent, {
      duration: 3 * 1000,
    });

    this.importDetail[id] = { complete: false };

  }

  edit(harvester: Harvester) {
    const dialogRef = this.dialog.open(DialogEditComponent, {
      data: harvester,
      width: '900px'
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      // this.animal = result;
    });
  }

  addHarvester() {
    const dialogRef = this.dialog.open(DialogEditComponent, {
      width: '900px'
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      // this.animal = result;
    });
  }

  stopPropagation($event: MouseEvent) {
    $event.stopImmediatePropagation();
  }
}
