/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or – as soon they will be
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

import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MonitoringComponent} from './monitoring.component';
import {MatLegacyButtonModule as MatButtonModule} from "@angular/material/legacy-button";
import {RouterModule, Routes} from '@angular/router';
import {SharedModule} from '../shared/shared.module';
import {ReactiveFormsModule} from '@angular/forms';
import {MatLegacyTabsModule as MatTabsModule} from "@angular/material/legacy-tabs";
import { MonitoringHarvesterComponent } from './monitoring-harvester/monitoring-harvester.component';
import { MonitoringUrlCheckComponent } from './monitoring-urlcheck/monitoring-urlcheck.component';
import { MonitoringIndexCheckComponent } from './monitoring-indexcheck/monitoring-indexcheck.component';
import {MatLegacyListModule as MatListModule} from "@angular/material/legacy-list";
import {MatIconModule} from "@angular/material/icon";
import {MatLegacyAutocompleteModule as MatAutocompleteModule} from "@angular/material/legacy-autocomplete";
import {FlexModule} from "@angular/flex-layout";
import {MatLegacySlideToggleModule as MatSlideToggleModule} from "@angular/material/legacy-slide-toggle";
import {MatLegacyCardModule as MatCardModule} from "@angular/material/legacy-card";
import {MatLegacyCheckboxModule as MatCheckboxModule} from "@angular/material/legacy-checkbox";
import {MonitoringUrlcheckDetailComponent} from "./monitoring-urlcheck/monitoring-urlcheck-detail/monitoring-urlcheck-detail.component";
import {MonitoringIndexCheckDetailComponent} from "./monitoring-indexcheck/monitoring-indexcheck-detail/monitoring-indexcheck-detail.component";
import {MatExpansionModule} from "@angular/material/expansion";
import { ScrollingModule } from '@angular/cdk/scrolling';

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
        MatExpansionModule,
        ScrollingModule
    ],
    exports: [
        MonitoringComponent
    ]
})
export class MonitoringModule { }
