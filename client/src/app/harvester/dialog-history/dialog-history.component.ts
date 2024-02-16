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

import {AfterViewInit, Component, Inject, OnInit} from '@angular/core';
import {Harvester} from '@shared/harvester';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {UntypedFormBuilder, FormGroup, Validators} from '@angular/forms';
import { Chart, registerables } from 'chart.js';

@Component({
  selector: 'app-dialog-history',
  templateUrl: './dialog-history.component.html',
  styleUrls: ['./dialog-history.component.scss']
})
export class DialogHistoryComponent implements OnInit, AfterViewInit {

  dialogTitle = 'Harvester Historie';

  data;

  chart;

  constructor(@Inject(MAT_DIALOG_DATA) public history: any,
              public dialogRef: MatDialogRef<DialogHistoryComponent>,
              private formBuilder: UntypedFormBuilder) {
    Chart.register(...registerables);
    Chart.defaults.color = 'white'; // Global text color

    this.data = history;
    // this.data = {
    //   history: [
    //     {timestamp: '2022-05-10', numRecords: 3000, numSkipped: 100, numRecordErrors: 500, numAppErrors: 0, numDBErrors: 0, numESErrors: 0, numWarnings: 400, duration: 260},
    //     {timestamp: '2022-05-11', numRecords: 3300, numSkipped: 200, numRecordErrors: 400, numAppErrors: 0, numDBErrors: 0, numESErrors: 0, numWarnings: 300, duration: 230},
    //     {timestamp: '2022-05-12', numRecords: 3500, numSkipped: 300, numRecordErrors: 400, numAppErrors: 0, numDBErrors: 0, numESErrors: 0, numWarnings: 300, duration: 180},
    //     {timestamp: '2022-05-13', numRecords: 3300, numSkipped: 400, numRecordErrors: 360, numAppErrors: 0, numDBErrors: 0, numESErrors: 0, numWarnings: 350, duration: 340},
    //     {timestamp: '2022-05-14', numRecords: 3200, numSkipped: 500, numRecordErrors: 300, numAppErrors: 0, numDBErrors: 0, numESErrors: 0, numWarnings: 450, duration: 210},
    //     {timestamp: '2022-05-15', numRecords: 3500, numSkipped: 600, numRecordErrors: 280, numAppErrors: 0, numDBErrors: 0, numESErrors: 0, numWarnings: 400, duration: 250},
    //     {timestamp: '2022-05-16', numRecords: 3100, numSkipped: 700, numRecordErrors: 250, numAppErrors: 0, numDBErrors: 0, numESErrors: 0, numWarnings: 350, duration: 300},
    //     {timestamp: '2022-05-17', numRecords: 3300, numSkipped: 700, numRecordErrors: 300, numAppErrors: 0, numDBErrors: 0, numESErrors: 0, numWarnings: 300, duration: 200},
    //   ]
    // }

  }

  ngOnInit() {
  }

  ngAfterViewInit() {
    this.chart = new Chart('chart', {
      type: 'line',
      data: {
        labels: this.data.history.map(entry => formatDate(entry.timestamp)),
        datasets: [
          {
            label : "Datensätze",
            data: this.data.history.map(entry => entry.numRecords - entry.numSkipped),
            borderColor: 'rgba(57, 140, 50, 0.7)', // green
            backgroundColor: 'rgba(101, 255, 87, 1)',
            fill: false,
            cubicInterpolationMode: 'monotone',
            yAxisID: 'left-y-axis'
          },
          {
            label : "Fehler",
            data: this.data.history.map(entry => entry.numRecordErrors+entry.numAppErrors+entry.numDBErrors+entry.numESErrors),
            borderColor: "rgba(238, 85, 85, 0.5)", // red
            backgroundColor: "rgba(238, 85, 85, 1)",
            fill: false,
            cubicInterpolationMode: 'monotone',
            yAxisID: 'left-y-axis'
          },
          {
            label : "Warnungen",
            data: this.data.history.map(entry => entry.numWarnings),
            borderColor: "rgba(255, 189, 91, 0.5)", // orange
            backgroundColor: "rgba(255, 189, 91, 1)",
            fill: false,
            cubicInterpolationMode: 'monotone',
            yAxisID: 'left-y-axis'
          },
          {
            label : "Dauer (s)",
            data: this.data.history.map(entry => entry.duration),
            borderColor: "rgba(152, 176, 217, 0.5)", // blue
            backgroundColor: "rgba(111, 190, 255, 1)",
            // color: "rgba(152, 176, 217, 0.5)",
            fill: false,
            cubicInterpolationMode: 'monotone',
            yAxisID: 'right-y-axis',
            hidden: true
          },
        ],
      },
      // raw: this.data.history,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            text: this.data.harvester,
            display: true
          },
          legend: {
            position: 'bottom',
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
            //   // Use the footer callback to display the sum of the items showing in the tooltip
              footer: function(tooltipItems):string {
                let result = ""
                tooltipItems.forEach(tooltipItem => {
                  // data.datasets[tooltipItem.index].data
                  result += tooltipItem.toString()
                })
                return result;
                // let entry = raw[tooltipItems[0].index];
                // let result = "\nAbgerufen: "+entry.numRecords+"\n";
                // result += "Übersprungen: "+entry.numSkipped+"\n";
                // if(entry.errors && entry.errors.length>0){
                //   result += "\nFehler:\n";
                //   entry.errors.sort((a, b) => b.count - a.count).slice(0, 5).forEach(error => result += "* "+error.message+(error.count>1?" ("+error.count+")":"")+"\n");
                // }
                // if(entry.warnings && entry.warnings.length>0){
                //   result += "\nWarnungen:\n";
                //   entry.warnings.sort((a, b) => b.count - a.count).slice(0, 5).forEach(warning => result += "* "+warning.message+(warning.count>1?" ("+warning.count+")":"")+"\n");
                // }
                // return result;
              },
            },
            footerFont: {weight: 'normal'}
          },
        },
        hover: {
          mode: 'nearest',
          intersect: true
        },
        scales: {
          x: {
            title: {
              display: true,
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          },
          'left-y-axis': {
            position: 'left',
            display: 'auto',
            title: {
              text: 'Anzahl',
              display: true,
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.2)'
            },
            beginAtZero: true,
            ticks: {
              padding: 10
            }
          },
          'right-y-axis': {
            position: 'right',
            display: 'auto',
            title: {
              text: 'Dauer (s)',
              display: true,
            },
            beginAtZero: true,
            ticks: {
              padding: 10
            },
            grid: {
              drawOnChartArea: false, // only want the grid lines for one axis to show up
            }
          }
        }
      }
    });
  }

}



function formatDate(timestamp) {
  const date = new Date(timestamp);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // JavaScript months are 0-based.
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}