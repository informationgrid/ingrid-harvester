import {Component, OnInit} from '@angular/core';
import {MonitoringService} from "../monitoring.service";
import {MatDialog} from "@angular/material/dialog";
import {Chart} from 'chart.js';
import {Observable} from "rxjs";
import {HttpClient} from "@angular/common/http";
import {MonitoringComponent} from "../monitoring.component";

@Component({
  selector: 'app-monitoring-harvester',
  templateUrl: './monitoring-harvester.component.html',
  styleUrls: ['./monitoring-harvester.component.scss']
})
export class MonitoringHarvesterComponent implements OnInit {

  dialogTitle = 'Harvester Historie';

  data;


  private chart : Chart;

  constructor(private configService: MonitoringService, private dialog: MatDialog, private http: HttpClient) {
  }

  ngOnInit() {
    this.data = this.getHarvesterHistory(6).toPromise();
    MonitoringComponent.setMonitoringHarvesterComponent(this);
  }

  getHarvesterHistory(id: number): Observable<any> {
    return this.http.get<any>('rest/api/harvester/histories');
  }

  public async draw_chart() {
    if (!this.chart) {
      this.data.then((data) => {
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
                data: data.history.map(entry => entry.numRecordErrors + entry.numAppErrors + entry.numESErrors),
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
                label: "Dauer",
                data: data.history.map(entry => entry.duration),
                borderColor: "yellow",
                backgroundColor: "yellow",
                fill: false,
                cubicInterpolationMode: 'monotone',
                yAxisID: 'right-y-axis'
              },
            ],
            raw: data.history
          },
          options: {
            responsive: true,
            title: {
              text: data.harvester,
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
                footer: function (tooltipItems, data) {
                  let entry = data.raw[tooltipItems[0].index];
                  let result = "\nAbgerufen: " + entry.numRecords + "\n";
                  result += "Übersprungen: " + entry.numSkipped + "\n";
                  if (entry.harvester && entry.harvester.length > 0) {
                    result += "\nHarvester:\n";
                    entry.harvester.forEach(harvester => result += "* " + harvester + "\n");
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
                display: true,
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
                  display: true,
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
        this.chart = new Chart('chart', chartOptions);
      });
    } else {
    }
  }
}
