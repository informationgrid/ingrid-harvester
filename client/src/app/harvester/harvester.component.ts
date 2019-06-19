import {Component, OnInit} from '@angular/core';
import {HarvesterService} from "./harvester.service";
import {of, zip} from "rxjs";
import {Harvester} from "./model/harvester";
import {MatDialog} from "@angular/material/dialog";
import {MatSnackBar} from "@angular/material/snack-bar";
import {DialogSchedulerComponent} from "./dialog-scheduler/dialog-scheduler.component";
import {DialogLogComponent} from "./dialog-log/dialog-log.component";
import {DialogEditComponent} from "./dialog-edit/dialog-edit.component";
import {ImportNotifyComponent} from "./notifications/import-notify.component";
import {Socket} from 'ngx-socket-io';
import {ImportLogMessage} from "../../../../server/model/import.result";
import {flatMap, groupBy, mergeMap, toArray} from 'rxjs/operators';

@Component({
  selector: 'app-harvester',
  templateUrl: './harvester.component.html',
  styleUrls: ['./harvester.component.scss']
})
export class HarvesterComponent implements OnInit {

  harvesters: {[x:string]: Harvester[]} = {};

  importInfo = this.socket.fromEvent<ImportLogMessage>('/log');

  importDetail: { [x: number]: ImportLogMessage } = {};

  constructor(private socket: Socket,
              public dialog: MatDialog,
              private snackBar: MatSnackBar,
              private harvesterService: HarvesterService) {
  }

  ngOnInit() {

    this.importInfo.subscribe(data => {
      console.log('Received from socket: ', data);
      this.importDetail[data.id] = data;
    });

    this.harvesterService.getHarvester().pipe(
      flatMap(items => of(...items)),
      groupBy(harvester => harvester.type.endsWith('CSW') ? 'CSW' : harvester.type),
      mergeMap(group => zip(of(group.key), group.pipe(toArray())))
    ).subscribe( data => {
      this.harvesters[data[0]] = data[1].sort((a, b) => a.description.localeCompare(b.description));
    });

    this.harvesterService.getLastLogs().subscribe(logs => {
      logs.forEach(log => this.importDetail[log.id] = log);
    });

  }

  schedule(id: number) {
    const dialogRef = this.dialog.open(DialogSchedulerComponent, {
      width: '900px'
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      // this.animal = result;
    });
  }

  showLog(id: number) {
    const dialogRef = this.dialog.open(DialogLogComponent, {
      width: '900px',
      data: {
        content: 'xxx'
      }
    });
  }

  startImport(id: number) {

    this.harvesterService.runImport(id).subscribe();

    this.snackBar.openFromComponent(ImportNotifyComponent, {
      duration: 3 * 1000
    });

    this.importDetail[id] = {complete: false};

  }

  edit(harvester: Harvester) {
    const dialogRef = this.dialog.open(DialogEditComponent, {
      data: harvester,
      width: '900px'
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed', result);
      if (result) {
        this.harvesterService.updateHarvester(result).subscribe();
      }
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
