import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MonitoringComponent} from './monitoring.component';
import {MatButtonModule} from "@angular/material/button";
import {RouterModule, Routes} from '@angular/router';
import {SharedModule} from '../shared/shared.module';
import {ReactiveFormsModule} from '@angular/forms';
import {MatTabsModule} from "@angular/material/tabs";
import { MonitoringHarvesterComponent } from './monitoring-harvester/monitoring-harvester.component';
import { MonitoringUrlcheckComponent } from './monitoring-urlcheck/monitoring-urlcheck.component';
import {MatListModule} from "@angular/material/list";
import {MatIconModule} from "@angular/material/icon";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {FlexModule} from "@angular/flex-layout";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MatCardModule} from "@angular/material/card";
import {MatCheckboxModule} from "@angular/material/checkbox";

const configRoutes: Routes = [
  {
    path: '',
    component: MonitoringComponent
  }
];

@NgModule({
  declarations: [MonitoringComponent, MonitoringHarvesterComponent, MonitoringUrlcheckComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(configRoutes),
    SharedModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatListModule,
    MatIconModule,
    MatAutocompleteModule,
    FlexModule,
    MatSlideToggleModule,
    MatCardModule,
    MatCheckboxModule
  ],
  exports: [
    MonitoringComponent
  ]
})
export class MonitoringModule { }
