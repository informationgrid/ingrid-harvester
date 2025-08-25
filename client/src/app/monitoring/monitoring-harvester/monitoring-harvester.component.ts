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

import { historyChart } from '../../charts/reuseableChart';
import { Chart } from 'chart.js';
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MonitoringService } from '../monitoring.service';
import { Observable } from 'rxjs';

@Component({
    selector: 'app-monitoring-harvester',
    templateUrl: './monitoring-harvester.component.html',
    styleUrls: ['./monitoring-harvester.component.scss'],
    standalone: false
})
export class MonitoringHarvesterComponent implements OnInit {

  private chart : Chart;

  constructor(private configService: MonitoringService, private dialog: MatDialog, private http: HttpClient) {
  }

  ngOnInit() {
    // MonitoringComponent.setMonitoringHarvesterComponent(this);
  }

  ngAfterViewInit() {
    this.drawChart()
  }

  getHarvesterHistory(): Observable<any> {
    return this.http.get<any>('rest/api/monitoring/harvester');
  }

  public async drawChart() {
    if (!this.chart) {
      this.getHarvesterHistory().toPromise().then((data) => {
        this.chart = historyChart('chart_harvester', data.history)
      });
    } else {
    }
  }


}
