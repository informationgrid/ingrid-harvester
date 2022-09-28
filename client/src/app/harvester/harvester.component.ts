/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2021 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

import {Component, OnDestroy, OnInit} from '@angular/core';
import {HarvesterService} from './harvester.service';
import {of, Subscription, zip} from 'rxjs';
import {Harvester} from '@shared/harvester';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {DialogSchedulerComponent} from './dialog-scheduler/dialog-scheduler.component';
import {DialogLogComponent} from './dialog-log/dialog-log.component';
import {DialogEditComponent} from './dialog-edit/dialog-edit.component';
import {DialogHistoryComponent} from './dialog-history/dialog-history.component';
import {ImportLogMessage} from '../../../../server/app/model/import.result';
import {flatMap, groupBy, mergeMap, tap, toArray} from 'rxjs/operators';
import {MatSlideToggleChange} from '@angular/material';
import {SocketService} from './socket.service';
import {ConfirmDialogComponent} from '../shared/confirm-dialog/confirm-dialog.component';
import {untilDestroyed} from 'ngx-take-until-destroy';

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

    this.subscription = this.socketService.log$
      .pipe(untilDestroyed(this))
      .subscribe(data => this.importDetail[data.id] = data);

    this.fetchHarvester();
    this.fetchLastImportInformation();

    this.socketService.connectionLost$
      .pipe(untilDestroyed(this))
      .subscribe(isLost => {
        if (isLost) {
          this.snackBar.open('Verbindung zum Backend verloren');
        } else {
          this.snackBar.open('Verbindung zum Backend hergestellt', null, {duration: 1000});
          this.fetchLastImportInformation();
          if (!this.harvesterLoaded) {
            this.fetchHarvester();
          }
        }
      });

  }

  private fetchLastImportInformation() {
    this.harvesterService.getLastLogs().subscribe(logs => {
      logs.forEach(log => this.importDetail[log.id] = log);
    });
  }

  ngOnDestroy(): void {
  }

  schedule(harvester: Harvester) {
    const dialogRef = this.dialog.open(DialogSchedulerComponent, {
      width: '500px',
      data: {...harvester.cron}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('The dialog was closed', result);

        // update immediately component cronpattern
        harvester.cron = result;

        // update schedule and set next execution time
        this.harvesterService.schedule(harvester.id, harvester.cron)
          .subscribe(nextExecution => {
            // update immediately next execution time which is only calculated to the server
            const detailElement = this.importDetail[harvester.id];
            if (detailElement) {
              detailElement.nextExecution = nextExecution;
            }
          }, (error: Error) => this.showError(error));
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

  startImport(id: number, isIncremental: boolean = false, isConcurrent: boolean = false) {

    this.harvesterService.runImport(id, isIncremental, isConcurrent).subscribe();

    this.snackBar.open('Import gestartet', null, {
      duration: 3 * 1000
    });

    this.importDetail[id] = {complete: false};

  }

  copy(harvester: Harvester) {
    const dialogRef = this.dialog.open(DialogEditComponent, {
      data: {
        ...JSON.parse(JSON.stringify(harvester)),
        id: -1,
        index: '',
        description: harvester.description + ' (Copy)'
      },
      width: '950px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result: Harvester) => {
      if (result) {
        console.log('The dialog was closed', result);
        this.harvesterService.updateHarvester(result).subscribe(
          () => this.fetchHarvester(),
          err => alert(err.message));
      }
    });
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
        }, err => alert(err.message));
      }
    });
  }

  addHarvester() {
    const dialogRef = this.dialog.open(DialogEditComponent, {
      data: {
        id: -1,
        rules: {}
      },
      width: '900px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('The dialog was closed', result);
        this.harvesterService.updateHarvester(result).subscribe(
          () => this.fetchHarvester(),
          err => alert(err.message));
      }
    });
  }

  async showHistory(harvester: Harvester) {
    let data = await this.harvesterService.getHarvesterHistory(harvester.id).toPromise();
    if(data && data.history.length > 0){
    const dialogRef = this.dialog.open(DialogHistoryComponent, {
      data: data,
      width: '950px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result: Harvester) => {
      if (result) {
        this.harvesterService.updateHarvester(result).subscribe(() => {
          // update view by modifying original object
          Object.keys(harvester).forEach(key => harvester[key] = result[key]);
        }, err => alert(err.message));
      }
    });
    }
    else {
      alert('Keine Historie für diesen Importer vorhanden!');
    }
  }

  handleActivation($event: MatSlideToggleChange, harvester: Harvester) {
    harvester.disable = !$event.checked;
    this.harvesterService.updateHarvester(harvester).subscribe(
      () => {
      },
      err => alert(err.message));
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
