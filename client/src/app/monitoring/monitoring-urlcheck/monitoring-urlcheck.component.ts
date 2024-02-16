/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
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
import {MonitoringUrlcheckDetailComponent} from "./monitoring-urlcheck-detail/monitoring-urlcheck-detail.component";
import { urlCheckChart } from 'src/app/charts/reuseableChart';
import { formatDateAndTime } from 'src/app/utils/dateUtils';

@Component({
  selector: 'app-monitoring-urlcheck',
  templateUrl: './monitoring-urlcheck.component.html',
  styleUrls: ['./monitoring-urlcheck.component.scss']
})
export class MonitoringUrlCheckComponent implements OnInit {

  data;


  private chartUrlCheck : Chart;
  private dialog: MatDialog;


  constructor(private http: HttpClient, private _dialog: MatDialog) {
    // Chart.register(...registerables);
    // Chart.defaults.color = 'white'; // Global text color
    this.dialog = _dialog;
  }

  ngOnInit() {
  }

  ngAfterViewInit() {
    this.draw_chart()
  }
  getHarvesterHistory(id: number): Observable<any> {
    return this.http.get<any>('rest/api/monitoring/urlcheck');
  }

  public async draw_chart() {
    let dialog = this.dialog;
    if (!this.chartUrlCheck) {
      this.getHarvesterHistory(6).toPromise().then((data) => {
        this.chartUrlCheck = urlCheckChart('chart_urlcheck', data.history)
      });
    } else {
    }
  }

  async showDetails(data) {
    if(data){
      const dialogRef = this.dialog.open(MonitoringUrlcheckDetailComponent, {
        data: data,
        width: '950px',
        disableClose: true
      });
    }
  }


  urlCheck() {
    this.startUrlCheck().subscribe();
  }

  startUrlCheck(): Observable<void> {
    return this.http.post<void>('rest/api/url_check', null);
  }
}
