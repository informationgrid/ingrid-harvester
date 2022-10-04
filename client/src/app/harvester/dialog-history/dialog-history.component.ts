/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2022 wemove digital solutions GmbH
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

import {AfterViewInit, Component, Inject, OnInit} from '@angular/core';
import {Harvester} from '@shared/harvester';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import { Chart } from 'chart.js';



@Component({
  selector: 'app-dialog-history',
  templateUrl: './dialog-history.component.html',
  styleUrls: ['./dialog-history.component.scss']
})
export class DialogHistoryComponent implements OnInit, AfterViewInit {

  dialogTitle = 'Harvester Historie';

  data ;


  chart;

  constructor(@Inject(MAT_DIALOG_DATA) public history: any,
              public dialogRef: MatDialogRef<DialogHistoryComponent>,
              private formBuilder: FormBuilder) {

      this.data = history;
  }

  ngOnInit() {

  }

  ngAfterViewInit() {
    this.chart = new Chart('chart', {
      type: 'line',
      data: {
        labels: this.data.history.map(entry => new Date(entry.timestamp)),
        datasets: [
          {
            label : "Datensätze",
            data: this.data.history.map(entry => entry.numRecords - entry.numSkipped),
            borderColor: "blue",
            backgroundColor: "blue",
            fill: false,
            cubicInterpolationMode: 'monotone',
            yAxisID: 'left-y-axis'
          },
          {
            label : "Fehler",
            data: this.data.history.map(entry => entry.numRecordErrors+entry.numAppErrors+entry.numESErrors),
            borderColor: "red",
            backgroundColor: "red",
            fill: false,
            cubicInterpolationMode: 'monotone',
            yAxisID: 'left-y-axis'
          },
          {
            label : "Warnungen",
            data: this.data.history.map(entry => entry.numWarnings),
            borderColor: "orange",
            backgroundColor: "orange",
            fill: false,
            cubicInterpolationMode: 'monotone',
            yAxisID: 'left-y-axis'
          },
          {
            label : "Dauer (s)",
            data: this.data.history.map(entry => entry.duration),
            borderColor: "yellow",
            backgroundColor: "yellow",
            fill: false,
            cubicInterpolationMode: 'monotone',
            yAxisID: 'right-y-axis',
            hidden: true
          },
        ],
        raw: this.data.history
      },
      options: {
        responsive: true,
        title: {
          text: this.data.harvester,
          display: true
        },
        legend: {
          position: 'bottom',
        },
        tooltips: {
          mode: 'index',
          intersect: false,
          callbacks: {
            // Use the footer callback to display the sum of the items showing in the tooltip
            footer: function(tooltipItems, data) {
              let entry = data.raw[tooltipItems[0].index];
              let result = "\nAbgerufen: "+entry.numRecords+"\n";
              result += "Übersprungen: "+entry.numSkipped+"\n";
              if(entry.errors && entry.errors.length>0){
                result += "\nFehler:\n";
                entry.errors.sort((a, b) => b.count - a.count).slice(0, 5).forEach(error => result += "* "+error.message+(error.count>1?" ("+error.count+")":"")+"\n");
              }
              if(entry.warnings && entry.warnings.length>0){
                result += "\nWarnungen:\n";
                entry.warnings.sort((a, b) => b.count - a.count).slice(0, 5).forEach(warning => result += "* "+warning.message+(warning.count>1?" ("+warning.count+")":"")+"\n");
              }
              return result;
            },
          },
          footerFontStyle: 'normal'
        },
        hover: {
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
    });
  }

}
