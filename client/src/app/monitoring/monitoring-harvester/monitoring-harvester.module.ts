import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MonitoringHarvesterComponent } from './monitoring-harvester.component';

@NgModule({
  declarations: [MonitoringHarvesterComponent],
  imports: [CommonModule],
  exports: [MonitoringHarvesterComponent] // Export it if you want to use it outside this module
})
export class MonitoringHarvesterModule { }