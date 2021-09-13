/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2021 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.1 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  http://ec.europa.eu/idabc/eupl5
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

import {Component, OnInit} from '@angular/core';
import {MonitoringService} from '../monitoring.service';
import {HarvesterService} from '../../harvester/harvester.service';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';

import {Chart} from 'chart.js';
import {Observable} from "rxjs";
import {MatDialog} from "@angular/material/dialog";
import {HttpClient} from "@angular/common/http";
import {MonitoringIndexCheckDetailComponent} from "./monitoring-indexcheck-detail/monitoring-indexcheck-detail.component";
import {MonitoringComponent} from "../monitoring.component";

@Component({
  selector: 'app-monitoring-indexcheck',
  templateUrl: './monitoring-indexcheck.component.html',
  styleUrls: ['./monitoring-indexcheck.component.scss']
})
export class MonitoringIndexCheckComponent implements OnInit {

  data;


  private chart : Chart;
  private dialog: MatDialog;


  constructor(private http: HttpClient, private _dialog: MatDialog) {
    this.dialog = _dialog;
  }

  ngOnInit() {
    MonitoringComponent.setMonitoringIndexCheckComponent(this);
  }

  getHarvesterHistory(id: number): Observable<any> {
    return this.http.get<any>('rest/api/monitoring/indexcheck');
  }

  public async draw_chart() {
    let dialog = this.dialog;
    if (!this.chart) {
      this.getHarvesterHistory(6).toPromise().then((data) => {
        let chartOptions = {
          type: 'line',
          data: {
            labels: data.history.map(entry => new Date(entry.timestamp)),
            datasets: [
              {
                label: "Valid",
                data: data.history.map(entry => entry.attributions.map(attribution => attribution.is_valid.filter(valid => valid.value === "true").map(valid =>  valid.count)).reduce((a, b) => Number(a)+Number(b))),
                borderColor: "green",
                backgroundColor: "green",
                fill: false,
                cubicInterpolationMode: 'monotone',
                yAxisID: 'left-y-axis'
              },
              {
                label: "Not Valid",
                data: data.history.map(entry => entry.attributions.map(attribution => attribution.is_valid.filter(valid => valid.value === "false").map(valid =>  valid.count)).reduce((a, b) => Number(a)+Number(b))),
                borderColor: "red",
                backgroundColor: "red",
                fill: false,
                cubicInterpolationMode: 'monotone',
                yAxisID: 'left-y-axis'
              },
              {
                label: "Spatial",
                data: data.history.map(entry => entry.attributions.map(attribution => attribution.spatial).reduce((a, b) => Number(a)+Number(b))),
                borderColor: "purple",
                backgroundColor: "purple",
                fill: false,
                cubicInterpolationMode: 'monotone',
                yAxisID: 'left-y-axis'
              },
              {
                label: "Temporal",
                data: data.history.map(entry => entry.attributions.map(attribution => attribution.temporal).reduce((a, b) => Number(a)+Number(b))),
                borderColor: "blue",
                backgroundColor: "blue",
                fill: false,
                cubicInterpolationMode: 'monotone',
                yAxisID: 'left-y-axis'
              },
            ],
            raw: data.history
          },
          options: {
            responsive: true,
            title: {
              //text: data.harvester,
              display: false
            },
            legend: {
              position: 'bottom',
            },
            tooltips: {
              mode: 'index',
              intersect: false,/*
              callbacks: {
                // Use the footer callback to display the sum of the items showing in the tooltip
                footer: function (tooltipItems, data) {
                  let entry = data.raw[tooltipItems[0].index];
                  let result = "";
                  if (entry.status && entry.status.filter(status => isNaN(status.code) && status.code !== 'ftp').length > 0) {
                    result += "\nFehler:\n";
                    entry.status.filter(status => isNaN(status.code) && status.code !== 'ftp').forEach(status => result += "* " + status.code + "\n");
                  }
                  return result;
                },
              },*/
              footerFontStyle: 'normal'
            },
            'onClick' : function (evt) {/*
              if(evt.layerX >= (this.chart.chartArea.left + this.chart.canvas.offsetLeft)
                && evt.layerX <= (this.chart.chartArea.right + this.chart.canvas.offsetLeft)
                && evt.layerY >= (this.chart.chartArea.top + this.chart.canvas.offsetTop)
                && evt.layerY <= (this.chart.chartArea.bottom + this.chart.canvas.offsetTop)) {
              var activePoints = this.chart.getElementsAtEventForMode(evt, 'index', { intersect: false }, true);
              if(activePoints && activePoints.length > 0){
                let data = this.chart.data.raw[activePoints[0]._index];
                dialog.open(MonitoringIndexCheckDetailComponent, {
                  data: data,
                  width: '950px',
                  disableClose: true
                });
              }}*/
            },
            hover: {
              mode: 'nearest',
              intersect: true
            },
            click: {
              mode: 'nearest',
              intersect: true
            },
            scales: {
              xAxes: [{
                type: 'time',
                distribution: 'series',
                time: {
                  tooltipFormat: 'DD.MM.YYYY HH:mm:ss',
                  unit: 'day',
                  unitStepSize: 1,
                  displayFormats: {
                    'day': 'DD.MM.'
                  }
                },
                display: true,
                scaleLabel: {
                  display: true,
                },
                gridLines: {
                  color: 'rgba(255, 255, 255, 0.1)'
                }
              }],
              yAxes: [{
                id: 'left-y-axis',
                position: 'left',
                display: 'auto',
                scaleLabel: {
                  labelString: 'Anzahl',
                  display: true,
                },
                gridLines: {
                  color: 'rgba(255, 255, 255, 0.2)'
                },
                ticks: {
                  beginAtZero: true,
                  padding: 10
                }
              },
                {
                  id: 'right-y-axis',
                  position: 'right',
                  display: 'auto',
                  scaleLabel: {
                    labelString: 'Dauer (s)',
                    display: true,
                  },
                  ticks: {
                    beginAtZero: true,
                    padding: 10
                  },
                  gridLines: {
                    drawOnChartArea: false, // only want the grid lines for one axis to show up
                  }
                }]
            }
          }
        };
        this.chart = new Chart('chart_indexcheck', chartOptions);
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
