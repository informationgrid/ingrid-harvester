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

import {Component, OnInit} from '@angular/core';
import {MonitoringHarvesterComponent} from "./monitoring-harvester/monitoring-harvester.component";
import {MonitoringIndexCheckComponent} from "./monitoring-indexcheck/monitoring-indexcheck.component";
import { Chart, registerables } from 'chart.js';

@Component({
  selector: 'app-monitoring',
  templateUrl: './monitoring.component.html',
  styleUrls: ['./monitoring.component.scss']
})
export class MonitoringComponent implements OnInit {

  breakpoint;
  breakpointCols;
  constructor() {
    Chart.register(...registerables);
    Chart.defaults.color = 'black'; // Global text color
  }
  
  ngOnInit() {
    this.breakpoint = (window.innerWidth <= 1400) ? 1 : 2;
    this.breakpointCols = (window.innerWidth <= 1400) ? 1 : 2;
  }


  onResize(event) {
    this.breakpoint = (event.target.innerWidth <= 1400) ? 1 : 2;
    this.breakpointCols = (event.target.innerWidth <= 1400) ? 1 : 2;
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
