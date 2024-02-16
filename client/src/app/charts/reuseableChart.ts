import { Chart } from "chart.js";
import { formatDateAndTime, formatDay } from "../utils/dateUtils";

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
              hidden: true,
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
                padding: 60,
              },
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              footerFont: {weight: 'normal'},
              callbacks: {
                title: (tooltipItems) => { 
                  let nr: number;
                  tooltipItems.forEach(tooltipItem => { nr = tooltipItem.dataIndex });
                  return formatDateAndTime(data[nr].timestamp)
                },
                // Use the footer callback to display the sum of the items showing in the tooltip
                footer: (tooltipItems) => {
                  let nr: number;
                  tooltipItems.forEach(tooltipItem => { nr = tooltipItem.dataIndex });
                  let entry = data[nr];
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


export function urlCheckChart(chartName, data){
    console.log(data)
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
                  padding: 60,
                },
              },
              tooltip: {
                mode: 'index',
                intersect: false,
                footerFont: {weight: 'normal'},
                // callbacks: {
                //   // Use the footer callback to display the sum of the items showing in the tooltip
                //   footer: function (tooltipItems, data) {
                //     let entry = data.raw[tooltipItems[0].index];
                //     let result = "";
                //     if (entry.status && entry.status.filter(status => isNaN(status.code) && status.code !== 'ftp').length > 0) {
                //       result += "\nFehler:\n";
                //       entry.status.filter(status => isNaN(status.code) && status.code !== 'ftp').forEach(status => result += "* " + status.code + "\n");
                //     }
                //     return result;
                //   },
                // },
              },
            },
            // onClick : function (evt) {
            //   if(evt.layerX >= (this.chart.chartArea.left + this.chart.canvas.offsetLeft)
            //   && evt.layerX <= (this.chart.chartArea.right + this.chart.canvas.offsetLeft)
            //   && evt.layerY >= (this.chart.chartArea.top + this.chart.canvas.offsetTop)
            //   && evt.layerY <= (this.chart.chartArea.bottom + this.chart.canvas.offsetTop)) {
            //   var activePoints = this.chart.getElementsAtEventForMode(evt, 'index', { intersect: false }, true);
            //   if(activePoints && activePoints.length > 0){
            //     let data = this.chart.data.raw[activePoints[0]._index];
            //     dialog.open(MonitoringUrlcheckDetailComponent, {
            //       data: data,
            //       width: '950px',
            //       disableClose: true
            //     });
            //   }}
            // },
            hover: {
                mode: 'nearest',
                intersect: true
            },
            // click: {
            //   mode: 'nearest',
            //   intersect: true
            // },
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
              padding: 60,
            },
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            footerFont: {weight: 'normal'},
            callbacks: {
              title: (tooltipItems) => { 
                let nr: number;
                tooltipItems.forEach(tooltipItem => { nr = tooltipItem.dataIndex });
                return formatDateAndTime(data[nr].timestamp)
              },
              footer: function (tooltipItems) {
                let nr: number;
                tooltipItems.forEach(tooltipItem => { nr = tooltipItem.dataIndex });
                let entry = data[nr];
                // let entry = data.raw[tooltipItems[0].index];
                let result = "";
                if (entry.status && entry.status.filter(status => isNaN(status.code) && status.code !== 'ftp').length > 0) {
                  result += "\nFehler:\n";
                  entry.status.filter(status => isNaN(status.code) && status.code !== 'ftp').forEach(status => result += "* " + status.code + "\n");
                }
                return result;
              },
              // Use the footer callback to display the sum of the items showing in the tooltip
              // footer: (tooltipItems) => {
              //   let nr: number;
              //   tooltipItems.forEach(tooltipItem => { nr = tooltipItem.dataIndex });
              //   let entry = data[nr];
              //   let result = "\nAbgerufen: "+entry.numRecords+"\n";
              //   result += "Übersprungen: "+entry.numSkipped+"\n";
              //   if(entry.errors && entry.errors.length>0){
              //     result += "\nFehler:\n";
              //     entry.errors.sort((a, b) => b.count - a.count).slice(0, 5).forEach(error => result += "* "+error.message+(error.count>1?" ("+error.count+")":"")+"\n");
              //   }
              //   if(entry.warnings && entry.warnings.length>0){
              //     result += "\nWarnungen:\n";
              //     entry.warnings.sort((a, b) => b.count - a.count).slice(0, 5).forEach(warning => result += "* "+warning.message+(warning.count>1?" ("+warning.count+")":"")+"\n");
              //   }
              //   return result;
              // },
            },
          },
        },
        // onClick : function (evt) {/*
        //   if(evt.layerX >= (this.chart.chartArea.left + this.chart.canvas.offsetLeft)
        //     && evt.layerX <= (this.chart.chartArea.right + this.chart.canvas.offsetLeft)
        //     && evt.layerY >= (this.chart.chartArea.top + this.chart.canvas.offsetTop)
        //     && evt.layerY <= (this.chart.chartArea.bottom + this.chart.canvas.offsetTop)) {
        //   var activePoints = this.chart.getElementsAtEventForMode(evt, 'index', { intersect: false }, true);
        //   if(activePoints && activePoints.length > 0){
        //     let data = this.chart.data.raw[activePoints[0]._index];
        //     dialog.open(MonitoringIndexCheckDetailComponent, {
        //       data: data,
        //       width: '950px',
        //       disableClose: true
        //     });
        //   }}*/
        // },
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