import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MonitoringComponent} from './monitoring.component';
import {MatButtonModule} from "@angular/material/button";
import {RouterModule, Routes} from '@angular/router';
import {SharedModule} from '../shared/shared.module';
import {ReactiveFormsModule} from '@angular/forms';
import {MatTabsModule} from "@angular/material/tabs";
import { MonitoringHarvesterComponent } from './monitoring-harvester/monitoring-harvester.component';
import { MonitoringUrlCheckComponent } from './monitoring-urlcheck/monitoring-urlcheck.component';
import { MonitoringIndexCheckComponent } from './monitoring-indexcheck/monitoring-indexcheck.component';
import {MatListModule} from "@angular/material/list";
import {MatIconModule} from "@angular/material/icon";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {FlexModule} from "@angular/flex-layout";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MatCardModule} from "@angular/material/card";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MonitoringUrlcheckDetailComponent} from "./monitoring-urlcheck/monitoring-urlcheck-detail/monitoring-urlcheck-detail.component";
import {MonitoringIndexCheckDetailComponent} from "./monitoring-indexcheck/monitoring-indexcheck-detail/monitoring-indexcheck-detail.component";
import {MatExpansionModule} from "@angular/material/expansion";

const configRoutes: Routes = [
  {
    path: '',
    component: MonitoringComponent
  }
];

@NgModule({
  declarations: [MonitoringComponent, MonitoringHarvesterComponent, MonitoringUrlCheckComponent, MonitoringUrlcheckDetailComponent, MonitoringIndexCheckComponent, MonitoringIndexCheckDetailComponent],
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
    MatCheckboxModule,
    MatExpansionModule
  ],
  entryComponents: [
    MonitoringUrlcheckDetailComponent,
    MonitoringIndexCheckDetailComponent
  ],
  exports: [
    MonitoringComponent
  ]
})
export class MonitoringModule { }
