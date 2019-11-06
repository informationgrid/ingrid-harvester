import {Component, OnDestroy, OnInit} from '@angular/core';
import {HarvesterService} from './harvester.service';
import {of, Subscription, zip} from 'rxjs';
import {Harvester} from '@shared/harvester';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {DialogSchedulerComponent} from './dialog-scheduler/dialog-scheduler.component';
import {DialogLogComponent} from './dialog-log/dialog-log.component';
import {DialogEditComponent} from './dialog-edit/dialog-edit.component';
import {ImportLogMessage} from '../../../../server/app/model/import.result';
import {flatMap, groupBy, mergeMap, tap, toArray} from 'rxjs/operators';
import {MatSlideToggleChange} from '@angular/material';
import {SocketService} from './socket.service';
import {ConfirmDialogComponent} from '../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-harvester',
  templateUrl: './harvester.component.html',
  styleUrls: ['./harvester.component.scss']
})
export class HarvesterComponent implements OnInit, OnDestroy {

  harvesters: { [x: string]: Harvester[] } = {};

  importDetail: { [x: number]: ImportLogMessage } = {};

  harvesterLoaded = false;

  numberOfHarvesters: number;
  private subscription: Subscription;

  constructor(public dialog: MatDialog,
              private snackBar: MatSnackBar,
              private harvesterService: HarvesterService,
              private socketService: SocketService) {
  }

  ngOnInit() {

    this.subscription = this.socketService.log$.subscribe(data => this.importDetail[data.id] = data);

    this.fetchHarvester();

    this.harvesterService.getLastLogs().subscribe(logs => {
      logs.forEach(log => this.importDetail[log.id] = log);
    });

  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
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
        const detailElement = this.importDetail[harvester.id];
        if (detailElement) {
          detailElement.nextExecution = undefined;
        }

        // TODO: get updated schedule info and set next execution time
        this.harvesterService.schedule(harvester.id, cronExpression).subscribe({
          error: (error: Error) => this.showError(error)
        });
      }
    });
  }

  showLog(id: number) {
    this.dialog.open(DialogLogComponent, {
      width: '900px',
      height: '600px',
      data: {
        content: this.importDetail[id]
      }
    });
  }

  startImport(id: number) {

    this.harvesterService.runImport(id).subscribe();

    this.snackBar.open('Import gestartet', null, {
      duration: 3 * 1000
    });

    this.importDetail[id] = {complete: false};

  }

  edit(harvester: Harvester) {
    const dialogRef = this.dialog.open(DialogEditComponent, {
      data: JSON.parse(JSON.stringify(harvester)),
      width: '950px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result: Harvester) => {
      if (result) {
        this.harvesterService.updateHarvester(result).subscribe(() => {
          // update view by modifying original object
          Object.keys(harvester).forEach(key => harvester[key] = result[key]);
        });
      }
    });
  }

  addHarvester() {
    const dialogRef = this.dialog.open(DialogEditComponent, {
      width: '900px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed', result);
      this.harvesterService.updateHarvester(result).subscribe(() => this.fetchHarvester());
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

  importAll() {
    this.harvesterService.runImport(null).subscribe();
    this.snackBar.open('Import von allen Harvestern gestartet', null, {duration: 10000});
  }

  private fetchHarvester() {
    this.harvesterService.getHarvester().pipe(
      tap(items => this.numberOfHarvesters = items.length),
      flatMap(items => of(...items)),
      groupBy(harvester => harvester.type.endsWith('CSW') ? 'CSW' : harvester.type),
      mergeMap(group => zip(of(group.key), group.pipe(toArray())))
    ).subscribe(data => {
        this.harvesters[data[0]] = data[1].sort((a, b) => a.description.localeCompare(b.description)) as Harvester[];
      },
      (error) => console.error(error),
      () => this.harvesterLoaded = true
    );
  }

  hasAnyErrors(id: number) {
    const detail = this.importDetail[id];

    if (detail && detail.summary) {
      return detail.summary.numErrors > 0 || detail.summary.elasticErrors.length > 0 || detail.summary.appErrors.length > 0;
    } else {
      return false;
    }
  }

  hasOnlyWarnings(id: number) {
    const detail = this.importDetail[id];

    if (detail && detail.summary) {
      return detail.summary.warnings.length > 0 && detail.summary.numErrors === 0 && detail.summary.elasticErrors.length === 0;
    }
  }

  hasAnyProblems(id: number) {
    const detail = this.importDetail[id];

    if (detail && detail.summary) {
      return detail.summary.numErrors > 0
        || detail.summary.elasticErrors.length > 0
        || detail.summary.warnings.length > 0
        || detail.summary.appErrors.length > 0;
    } else {
      return false;
    }
  }

  deleteHarvester(harvester: Harvester) {
    this.dialog.open(ConfirmDialogComponent, {data: 'Wollen Sie diesen Harvester wirklich löschen?'}).afterClosed().subscribe(result => {
      if (result) {
        this.harvesterService.delete(harvester.id).subscribe(() => this.fetchHarvester());
      }
    });
  }
}
