import {Component, OnInit} from '@angular/core';
import {MonitoringHarvesterComponent} from "./monitoring-harvester/monitoring-harvester.component";
import {MonitoringIndexCheckComponent} from "./monitoring-indexcheck/monitoring-indexcheck.component";

@Component({
  selector: 'app-monitoring',
  templateUrl: './monitoring.component.html',
  styleUrls: ['./monitoring.component.scss']
})
export class MonitoringComponent implements OnInit {

  constructor() {
  }

  ngOnInit() {
  }

  private static monitoringHarvesterComponent: MonitoringHarvesterComponent;
  static setMonitoringHarvesterComponent(monitoringHarvesterComponent: MonitoringHarvesterComponent){
    MonitoringComponent.monitoringHarvesterComponent = monitoringHarvesterComponent;
  }

  private static monitoringIndexCheckComponent: MonitoringIndexCheckComponent;
  static setMonitoringIndexCheckComponent(monitoringIndexCheckComponent: MonitoringIndexCheckComponent){
    MonitoringComponent.monitoringIndexCheckComponent = monitoringIndexCheckComponent;
  }

  onTabChange(event) {

    if(event.tab.textLabel === 'Harvester Historie'){
      MonitoringComponent.monitoringHarvesterComponent.draw_chart();
    }

    if(event.tab.textLabel === 'IndexCheck'){
      MonitoringComponent.monitoringIndexCheckComponent.draw_chart();
    }

  }
}
