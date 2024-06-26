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

import { Chart } from "chart.js";
import { formatDateAndTime, formatDay } from "../utils/dateUtils";


const customTitle = (tooltipItems, data) => { 
  let nr: number;
  tooltipItems.forEach(tooltipItem => { nr = tooltipItem.dataIndex });
  return formatDateAndTime(data[nr].timestamp)
}
const customFooter = (tooltipItems, data) => {
  let nr: number;
  tooltipItems.forEach(tooltipItem => { nr = tooltipItem.dataIndex });
  let entry = data[nr];
  let result = ""
  if (entry.numRecords) result = "\nAbgerufen: "+entry.numRecords+"\n";
  if (entry.numSkipped) result += "Übersprungen: "+entry.numSkipped+"\n";
  if (entry.errors) result += "errors: "+entry.errors.length+"\n";
  if (entry.harvester && entry.harvester.length > 0) {
    result += "\nHarvester:";
    entry.harvester.sort((h1, h2) => h2.count - h1.count).forEach(harvester => {
      result += "\n· " + harvester.base_index + " (" + harvester.count +")";
    });
  }
  if(entry.errors && entry.errors.length>0){
    result += "\nFehler:\n";
    entry.errors.sort((a, b) => b.count - a.count).slice(0, 5).forEach(error => result += "· "+error.message+(error.count>1?" ("+error.count+")":"")+"\n");
  }
  if(entry.warnings && entry.warnings.length>0){
    result += "\nWarnungen:\n";
    entry.warnings.sort((a, b) => b.count - a.count).slice(0, 5).forEach(warning => result += "· "+warning.message+(warning.count>1?" ("+warning.count+")":"")+"\n");
  } 
  if (entry.status && entry.status.filter(status => isNaN(status.code) && status.code !== 'ftp').length > 0) {
    result += "\nFehler:\n";
    entry.status.filter(status => isNaN(status.code) && status.code !== 'ftp').forEach(status => result += "* " + status.code + "\n");
  }
  return result;
}

export function historyChart(chartName, data){
    return new Chart(chartName, {
        type: 'line',
        data: {
          labels: data.map(entry => formatDay(entry.timestamp)),
          datasets: 
          [
            {
              label : "Datensätze",
              data: data.map(entry => entry.numRecords - entry.numSkipped),
              borderColor: 'rgba(57, 140, 50, 0.7)', // green
              backgroundColor: 'rgba(101, 255, 87, 1)',
              fill: false,
              cubicInterpolationMode: 'monotone',
              yAxisID: 'left-y-axis',
            },
            {
              label : "Fehler",
              data: data.map(entry => entry.numRecordErrors+entry.numAppErrors+entry.numDBErrors+entry.numESErrors),
              borderColor: "rgba(238, 85, 85, 0.5)", // red
              backgroundColor: "rgba(238, 85, 85, 1)",
              fill: false,
              cubicInterpolationMode: 'monotone',
              yAxisID: 'left-y-axis'
            },
            {
              label : "Warnungen",
              data: data.map(entry => entry.numWarnings),
              borderColor: "rgba(255, 189, 91, 0.5)", // orange
              backgroundColor: "rgba(255, 189, 91, 1)",
              fill: false,
              cubicInterpolationMode: 'monotone',
              yAxisID: 'left-y-axis',
            },
            {
              label : "Dauer (s)",
              data: data.map(entry => entry.duration),
              borderColor: "rgba(152, 176, 217, 0.5)", // blue
              backgroundColor: "rgba(111, 190, 255, 1)",
              fill: false,
              cubicInterpolationMode: 'monotone',
              yAxisID: 'right-y-axis',
              // hidden: true,
            }
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              text: data.harvester,
              display: true,
              font: {
                size: 24,
              }
            },
            legend: {
              position: 'bottom',
              labels: {
                usePointStyle: true,
                pointStyle: 'circle',
                padding: 40,
              },
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              footerFont: {weight: 'normal'},
              callbacks: {
                title: tooltipItems => customTitle(tooltipItems, data),
                footer: tooltipItems => customFooter(tooltipItems, data),
              },
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
                color: 'rgba(0, 0, 0, 0.2)'
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


export function urlCheckChart(chartName, data){
    return new Chart(chartName, {
        type: 'line',
        data: {
          labels: data.map(entry => formatDay(entry.timestamp)),
          datasets: [
            {
              label: "2xx",
              data: data.map(entry => entry.status.filter(status => status.code >= 200 && status.code < 300).map(status => status.url.length).reduce((a, b) => a+b, 0)),
              borderColor: "green",
              backgroundColor: "green",
              fill: false,
              cubicInterpolationMode: 'monotone',
              yAxisID: 'left-y-axis'
            },
            {
              label: "4xx",
              data: data.map(entry => entry.status.filter(status => status.code >= 400 && status.code < 500).map(status => status.url.length).reduce((a, b) => a+b, 0)),
              borderColor: "purple",
              backgroundColor: "purple",
              fill: false,
              cubicInterpolationMode: 'monotone',
              yAxisID: 'left-y-axis'
            },
            {
              label: "5xx",
              data: data.map(entry => entry.status.filter(status => status.code >= 500 && status.code < 600).map(status => status.url.length).reduce((a, b) => a+b, 0)),
              borderColor: "orange",
              backgroundColor: "orange",
              fill: false,
              cubicInterpolationMode: 'monotone',
              yAxisID: 'left-y-axis'
            },
            {
              label: "Fehler",
              data: data.map(entry => entry.status.filter(status => isNaN(status.code)).map(status => status.url.length).reduce((a, b) => a+b, 0)),
              borderColor: "red",
              backgroundColor: "red",
              fill: false,
              cubicInterpolationMode: 'monotone',
              yAxisID: 'left-y-axis'
            },
            {
              label: "Dauer (s)",
              data: data.map(entry => entry.duration/1000),
              borderColor: "yellow",
              backgroundColor: "yellow",
              fill: false,
              cubicInterpolationMode: 'monotone',
              yAxisID: 'right-y-axis',
              hidden: true
            },
          ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                text: "URL Prüfung",
                display: false,
                font: {
                  size: 24,
                }
              },
              legend: {
                position: 'bottom',
                labels: {
                  usePointStyle: true,
                  pointStyle: 'circle',
                  padding: 40,
                },
              },
              tooltip: {
                mode: 'index',
                intersect: false,
                footerFont: {weight: 'normal'},
                callbacks: {
                  title: tooltipItems => customTitle(tooltipItems, data),
                  footer: tooltipItems => customFooter(tooltipItems, data),
                },
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
                    },
                },
                'left-y-axis': {
                    position: 'left',
                    display: 'auto',
                    title: {
                        text: 'Anzahl',
                        display: true,
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.2)'
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
    }
    )
}

export function indexCheckChart(chartName, data){
  return new Chart(chartName, {
      type: 'line',
      data: {
        labels: data.map(entry => formatDay(entry.timestamp)),
        datasets: 
        [
          {
            label : "Valid",
            data: data.map(entry => entry.numRecords - entry.numSkipped),
            borderColor: 'rgba(57, 140, 50, 0.7)', // green
            backgroundColor: 'rgba(101, 255, 87, 1)',
            fill: false,
            cubicInterpolationMode: 'monotone',
            yAxisID: 'left-y-axis',
          },
          {
            label : "Not Valid",
            data: data.map(entry => entry.numRecordErrors+entry.numAppErrors+entry.numDBErrors+entry.numESErrors),
            borderColor: "rgba(238, 85, 85, 0.5)", // red
            backgroundColor: "rgba(238, 85, 85, 1)",
            fill: false,
            cubicInterpolationMode: 'monotone',
            yAxisID: 'left-y-axis'
          },
          {
            label : "Spetial",
            data: data.map(entry => entry.numWarnings),
            borderColor: "rgba(255, 189, 91, 0.5)", // orange
            backgroundColor: "rgba(255, 189, 91, 1)",
            fill: false,
            cubicInterpolationMode: 'monotone',
            yAxisID: 'left-y-axis',
          },
          {
            label : "Temporal",
            data: data.map(entry => entry.duration),
            borderColor: "rgba(152, 176, 217, 0.5)", // blue
            backgroundColor: "rgba(111, 190, 255, 1)",
            fill: false,
            cubicInterpolationMode: 'monotone',
            yAxisID: 'left-y-axis',
          }
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            text: data.harvester,
            display: false,
            font: {
              size: 24,
            }
          },
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 40,
            },
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            footerFont: {weight: 'normal'},
            callbacks: {
              title: tooltipItems => customTitle(tooltipItems, data),
              footer: tooltipItems => customFooter(tooltipItems, data),
            },
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
              color: 'rgba(0, 0, 0, 0.2)'
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
        },
      }
    });
}

