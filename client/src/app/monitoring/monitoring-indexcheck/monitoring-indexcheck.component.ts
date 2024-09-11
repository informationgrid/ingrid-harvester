/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2024 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or - as soon they will be
 * approved by the European Commission - subsequent versions of the
 * EUPL (the "Licence");
 *
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the Licence is distributed on an "AS IS" basis,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and
 * limitations under the Licence.
 * ==================================================
 */

import {Component, OnInit} from '@angular/core';
import {MonitoringService} from '../monitoring.service';
import {HarvesterService} from '../../harvester/harvester.service';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';

import {Chart, registerables} from 'chart.js';
import {Observable} from "rxjs";
import {MatDialog} from "@angular/material/dialog";
import {HttpClient} from "@angular/common/http";
import {MonitoringIndexCheckDetailComponent} from "./monitoring-indexcheck-detail/monitoring-indexcheck-detail.component";
import {MonitoringComponent} from "../monitoring.component";
import { indexCheckChart } from 'src/app/charts/reuseableChart';

@Component({
  selector: 'app-monitoring-indexcheck',
  templateUrl: './monitoring-indexcheck.component.html',
  styleUrls: ['./monitoring-indexcheck.component.scss']
})
export class MonitoringIndexCheckComponent implements OnInit {

  data;


  private chartIndexCheck : Chart;
  private dialog: MatDialog;


  constructor(private http: HttpClient, private _dialog: MatDialog) {
    this.dialog = _dialog;
  }

  ngOnInit() {
    // MonitoringComponent.setMonitoringIndexCheckComponent(this);
  }

  ngAfterViewInit() {
    this.draw_chart()
  }

  getHarvesterHistory(id: number): Observable<any> {
    return this.http.get<any>('rest/api/monitoring/indexcheck');
  }

  public async draw_chart() {
    let dialog = this.dialog;
    if (!this.chartIndexCheck) {
      this.getHarvesterHistory(6).toPromise().then((data) => {
        this.chartIndexCheck = indexCheckChart('chart_indexcheck', data.history)
      });
    } else {
    }
  }

  async showDetails(data) {
    if(data){
      const dialogRef = this.dialog.open(MonitoringIndexCheckDetailComponent, {
        data: data,
        width: '950px',
        disableClose: true
      });
    }
  }


  indexCheck() {
    this.startIndexCheck().subscribe();
  }

  startIndexCheck(): Observable<void> {
    return this.http.post<void>('rest/api/index_check', null);
  }
}
