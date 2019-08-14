import {Component, OnInit} from '@angular/core';
import {HarvesterService} from './harvester.service';
import {of, zip} from 'rxjs';
import {Harvester} from './model/harvester';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {DialogSchedulerComponent} from './dialog-scheduler/dialog-scheduler.component';
import {DialogLogComponent} from './dialog-log/dialog-log.component';
import {DialogEditComponent} from './dialog-edit/dialog-edit.component';
import {ImportNotifyComponent} from './notifications/import-notify.component';
import {Socket} from 'ngx-socket-io';
import {ImportLogMessage} from '../../../../server/app/model/import.result';
import {flatMap, groupBy, mergeMap, toArray} from 'rxjs/operators';
import {MatSlideToggleChange} from '@angular/material';
import {ConfigService} from '../config.service';

@Component({
  selector: 'app-harvester',
  templateUrl: './harvester.component.html',
  styleUrls: ['./harvester.component.scss']
})
export class HarvesterComponent implements OnInit {

  harvesters: { [x: string]: Harvester[] } = {};

  importInfo = this.socket.fromEvent<ImportLogMessage>('/log');

  importDetail: { [x: number]: ImportLogMessage } = {};

  harvesterLoaded = false;

  constructor(private socket: Socket,
              public dialog: MatDialog,
              private snackBar: MatSnackBar,
              private harvesterService: HarvesterService,
              private configService: ConfigService) {

    if (configService.config) {
      let contextPath = configService.config.contextPath;
      console.log('modifiying socket URL to: ' + contextPath);
      if (configService.config.url) {
        this.socket.ioSocket.io.uri = configService.config.url + '/import';
      }
      if (contextPath) {
        this.socket.ioSocket.io.opts.path = (contextPath === '/' ? '' : contextPath) + '/socket.io';
      }
    }
    this.socket.ioSocket.open();
  }

  ngOnInit() {

    this.importInfo.subscribe(data => {
      console.log('Received from socket: ', data);
      this.importDetail[data.id] = data;
    });

    let a = this.harvesterService.getHarvester().pipe(
      flatMap(items => of(...items)),
      groupBy(harvester => harvester.type.endsWith('CSW') ? 'CSW' : harvester.type),
      mergeMap(group => zip(of(group.key), group.pipe(toArray())))
    ).subscribe(
      data => {
        this.harvesters[data[0]] = data[1].sort((a, b) => a.description.localeCompare(b.description));
      },
      (error) => console.error(error),
      () => this.harvesterLoaded = true
    );

    this.harvesterService.getLastLogs().subscribe(logs => {
      logs.forEach(log => this.importDetail[log.id] = log);
    });

  }

  schedule(harvester: Harvester) {
    const dialogRef = this.dialog.open(DialogSchedulerComponent, {
      width: '500px',
      data: harvester.cronPattern
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('The dialog was closed', result);
        const cronExpression = result === 'DISABLE' ? null : result;

        // update immediately component cronpattern
        harvester.cronPattern = cronExpression;

        // update immediately next execution time which is only calculated to the server
        this.importDetail[harvester.id].nextExecution = undefined;

        // TODO: get updated schedule info and set next execution time
        this.harvesterService.schedule(harvester.id, cronExpression).subscribe({
          error: (error: Error) => this.showError(error)
        });
      }
    });
  }

  showLog(id: number) {
    const dialogRef = this.dialog.open(DialogLogComponent, {
      width: '900px',
      height: '600px',
      data: {
        content: this.importDetail[id]
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
      width: '950px'
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

  handleActivation($event: MatSlideToggleChange, harvester: Harvester) {
    harvester.disable = !$event.checked;
    this.harvesterService.updateHarvester(harvester).subscribe();
  }

  private showError(error: Error) {
    console.error('Error occurred', error);
    this.snackBar.open(error.message, null, {panelClass: 'error', duration: 10000});
  }
}
