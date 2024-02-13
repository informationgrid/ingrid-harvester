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
import {MonitoringService} from "../monitoring.service";
import {MatDialog} from "@angular/material/dialog";
import {Chart} from 'chart.js';
import {Observable} from "rxjs";
import {HttpClient} from "@angular/common/http";
import {MonitoringComponent} from "../monitoring.component";
import {MonitoringUrlcheckDetailComponent} from "../monitoring-urlcheck/monitoring-urlcheck-detail/monitoring-urlcheck-detail.component";

@Component({
  selector: 'app-monitoring-harvester',
  templateUrl: './monitoring-harvester.component.html',
  styleUrls: ['./monitoring-harvester.component.scss']
})
export class MonitoringHarvesterComponent implements OnInit {

  private chart : Chart;

  private tooltipPinned : boolean = false;

  constructor(private configService: MonitoringService, private dialog: MatDialog, private http: HttpClient) {
  }

  ngOnInit() {
    MonitoringComponent.setMonitoringHarvesterComponent(this);
  }

  getHarvesterHistory(): Observable<any> {
    return this.http.get<any>('rest/api/monitoring/harvester');
  }

  public async draw_chart() {
    if (!this.chart) {
      this.getHarvesterHistory().toPromise().then((data) => {
        let chartOptions = {
          type: 'line',
          data: {
            labels: data.history.map(entry => new Date(entry.timestamp)),
            datasets: [
              {
                label: "Datensätze",
                data: data.history.map(entry => entry.numRecords - entry.numSkipped),
                borderColor: "blue",
                backgroundColor: "blue",
                fill: false,
                cubicInterpolationMode: 'monotone',
                yAxisID: 'left-y-axis'
              },
              {
                label: "Fehler",
                data: data.history.map(entry => entry.numRecordErrors + entry.numAppErrors + entry.numDBErrors + entry.numESErrors),
                borderColor: "red",
                backgroundColor: "red",
                fill: false,
                cubicInterpolationMode: 'monotone',
                yAxisID: 'left-y-axis'
              },
              {
                label: "Warnungen",
                data: data.history.map(entry => entry.numWarnings),
                borderColor: "orange",
                backgroundColor: "orange",
                fill: false,
                cubicInterpolationMode: 'monotone',
                yAxisID: 'left-y-axis'
              },
              {
                label: "Dauer (s)",
                data: data.history.map(entry => entry.duration),
                borderColor: "yellow",
                backgroundColor: "yellow",
                fill: false,
                cubicInterpolationMode: 'monotone',
                yAxisID: 'right-y-axis',
                hidden: true
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
              intersect: false,
              enabled: false,
              custom: this.customTooltips
              /*
              callbacks: {
                // Use the footer callback to display the sum of the items showing in the tooltip
                footer: function (tooltipItems, data) {
                  let entry = data.raw[tooltipItems[0].index];
                  let result = "\nAbgerufen: " + entry.numRecords + "\n";
                  result += "Übersprungen: " + entry.numSkipped + "\n";
                  if (entry.harvester && entry.harvester.length > 0) {
                    result += "\nHarvester:\n";
                    entry.harvester.sort((h1, h2) => h2.count - h1.count).forEach(harvester => result += "* " + harvester.base_index + "(" + harvester.count + ")\n");
                  }
                  return result;
                },
              },
              footerFontStyle: 'normal'*/
            },
            'onHover' : function (evt) {
              //console.log(this);
              if(this.chart.options.tooltipPinned){
                return;
              }
              //console.log(evt)
              if((evt.relatedTarget && evt.relatedTarget.id === 'chartjs-tooltip') || (evt.layerX >= (this.chart.chartArea.left + this.chart.canvas.offsetLeft)
                && evt.layerX <= (this.chart.chartArea.right + this.chart.canvas.offsetLeft)
                && evt.layerY >= (this.chart.chartArea.top + this.chart.canvas.offsetTop)
                && evt.layerY <= (this.chart.chartArea.bottom + this.chart.canvas.offsetTop))) {
                document.getElementById('chartjs-tooltip').hidden = false;
              } else {
                document.getElementById('chartjs-tooltip').hidden = true;
              }
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
          },
          tooltipPinned: false,
          tooltipIsDragging: false
        };
        this.chart = new Chart('chart_harvester', chartOptions);

        this.dragElement( document.getElementById('chartjs-tooltip'));
      });
    } else {
    }
  }


  customTooltips = function(tooltip) {

//    console.log(this);
    if(this._chart.options.tooltipPinned){
      return;
    }

    //console.log(tooltip);
    //console.log(this._chart);
    // Tooltip Element
    var tooltipEl = document.getElementById('chartjs-tooltip');

    var tooltipKeyAttributes = '';
    var tooltipKeyMaster = document.getElementById('chartjs-tooltip-key');
    if(tooltipKeyMaster) tooltipKeyAttributes = Object.values(document.getElementById('chartjs-tooltip-key').attributes).filter(a => a.name.startsWith('_ngcontent')).map(a => a.name+'="'+a.value+'"').join(' ');

    if (tooltip.x < this._chart.chartArea.left ||
      tooltip.x > this._chart.chartArea.right ||
      tooltip.y < this._chart.chartArea.top ||
      tooltip.y > this._chart.chartArea.bottom ) {
      tooltipEl.style.opacity = '0';
      return;
    }


    // Set caret Position
    tooltipEl.classList.remove('above', 'below', 'no-transform');
    if (tooltip.yAlign) {
      tooltipEl.classList.add(tooltip.yAlign);
    } else {
      tooltipEl.classList.add('no-transform');
    }

    function getBody(bodyItem) {
      return bodyItem.lines;
    }

    // Set Text
    if (tooltip.body) {
      var titleLines = tooltip.title || [];
      var bodyLines = tooltip.body.map(getBody);

      var innerHtml = '<thead>';

      titleLines.forEach(function(title) {
        innerHtml += '<tr><th>' + title + '</th></tr>';
      });
      innerHtml += '</thead><tbody>';

      bodyLines.forEach(function(body, i) {
        var colors = tooltip.labelColors[i];
        var style = 'background:' + colors.backgroundColor;
        style += '; border-color:' + colors.borderColor;
        style += '; border-width: 2px';
        var span = '<span class="chartjs-tooltip-key"' + tooltipKeyAttributes + ' style="' + style + '"></span>';
        innerHtml += '<tr><td>' + span + body + '</td></tr>';
      });
      innerHtml += '</tbody>';

      var tableRoot = tooltipEl.querySelector('table');
      tableRoot.innerHTML = innerHtml;


      let entry = this._chart.data.raw[tooltip.dataPoints[0].index];
      let footerHTML = "<br>Abgerufen: " + entry.numRecords + "<br>";
      footerHTML += "Übersprungen: " + entry.numSkipped + "<br>";
      if (entry.harvester && entry.harvester.length > 0) {
        footerHTML += "<br>Harvester:";
        footerHTML += '<ul>';
        entry.harvester.sort((h1, h2) => h2.count - h1.count).forEach(harvester => footerHTML += "<li>" + harvester.base_index + " (" + harvester.count + ")</li>");
        footerHTML += '</ul>';
      }
      var footerRoot = tooltipEl.querySelector('#chartjs-tooltip-footer');
      footerRoot.innerHTML = footerHTML
    }

    var positionY = this._chart.canvas.offsetTop;
    var positionX = this._chart.canvas.offsetLeft;

    var caretX = Math.max(tooltip.caretX, this._chart.chartArea.left + tooltipEl.clientWidth/2);
    caretX = Math.min(caretX, this._chart.chartArea.right- tooltipEl.clientWidth/4);

    var caretY = Math.min(tooltip.caretY, this._chart.chartArea.bottom - tooltipEl.clientHeight);
    caretY = Math.min(caretY, this._chart.chartArea.top + (this._chart.chartArea.bottom - this._chart.chartArea.top)/2);
    caretY = Math.max(caretY, this._chart.chartArea.top)
    //console.log(tooltipEl)

    // Display, position, and set styles for font
    tooltipEl.style.opacity = '1';
    tooltipEl.style.left = positionX + caretX + 'px';
    tooltipEl.style.top = positionY + caretY + 'px';
    tooltipEl.style.fontFamily = tooltip._bodyFontFamily;
    tooltipEl.style.fontSize = tooltip.bodyFontSize + 'px';
    tooltipEl.style.fontStyle = tooltip._bodyFontStyle;
    tooltipEl.style.padding = tooltip.yPadding + 'px ' + tooltip.xPadding + 'px';
  };

  dragElement(elmnt) {
    var chart = this.chart;
    var hasMoved = false;
    elmnt.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();

      chart.options.tooltipIsDragging = true;
      hasMoved = false;

      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();

      hasMoved = true;
      chart.options.tooltipPinned = true;

      elmnt.style.top = (parseFloat(elmnt.style.top) + e.movementY)+'px';
      elmnt.style.left = (parseFloat(elmnt.style.left) + e.movementX)+'px';
    }

    function closeDragElement() {
      chart.options.tooltipIsDragging = false;
      document.onmouseup = null;
      document.onmousemove = null;

      if(!hasMoved ||  !chart.options.tooltipPinned) {
        chart.options.tooltipPinned = !chart.options.tooltipPinned;
        var tooltipEl = document.getElementById('chartjs-tooltip');
        if (chart.options.tooltipPinned) {
          tooltipEl.style.border = '3px solid black';
        } else {
          tooltipEl.style.border = '0px solid black';
        }
      }
    }
  }
}
