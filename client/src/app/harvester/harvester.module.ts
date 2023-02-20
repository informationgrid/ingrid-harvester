/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2022 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

import {NgModule} from "@angular/core";
import {HarvesterComponent} from "./harvester.component";
import {MatButtonModule} from "@angular/material/button";
import {MatDialogModule} from "@angular/material/dialog";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatIconModule} from "@angular/material/icon";
import {MatProgressBarModule} from "@angular/material/progress-bar";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {CommonModule} from "@angular/common";
import {DialogSchedulerComponent} from './dialog-scheduler/dialog-scheduler.component';
import {DialogLogComponent} from './dialog-log/dialog-log.component';
import {DialogEditComponent} from './dialog-edit/dialog-edit.component';
import {ExcelHarvesterComponent} from './dialog-edit/excel-harvester/excel-harvester.component';
import {ExcelSparseHarvesterComponent} from './dialog-edit/excel-sparse-harvester/excel-sparse-harvester.component';
import {CkanHarvesterComponent} from './dialog-edit/ckan-harvester/ckan-harvester.component';
import {CswHarvesterComponent} from './dialog-edit/csw-harvester/csw-harvester.component';
import {OaiHarvesterComponent} from './dialog-edit/oai-harvester/oai-harvester.component';
import {SparqlHarvesterComponent} from './dialog-edit/sparql-harvester/sparql-harvester.component';
import {WfsHarvesterComponent} from './dialog-edit/wfs-harvester/wfs-harvester.component';
import {DialogHistoryComponent} from './dialog-history/dialog-history.component';
import {ImporterDetailComponent} from './importer-detail/importer-detail.component';
import {FlexLayoutModule} from "@angular/flex-layout";
import {MatChipsModule} from '@angular/material/chips';
import {MatCardModule} from '@angular/material/card';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatListModule} from '@angular/material/list';
import {MatTabsModule} from '@angular/material/tabs';
import {RouterModule, Routes} from '@angular/router';
import {SharedModule} from '../shared/shared.module';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {ReactiveFormsModule} from '@angular/forms';
import {ChipListComponent} from './dialog-edit/chip-list/chip-list.component';
import {MatBadgeModule} from "@angular/material/badge";
import {DcatHarvesterComponent} from "./dialog-edit/dcat-harvester/dcat-harvester.component";
import {ScrollingModule} from '@angular/cdk/scrolling';

const harvesterRoutes: Routes = [
  {
    path: '',
    component: HarvesterComponent
  }
];

@NgModule({
  declarations: [
    HarvesterComponent,
    DialogSchedulerComponent,
    DialogLogComponent,
    DialogEditComponent,
    DialogHistoryComponent,
    ExcelHarvesterComponent,
    ExcelSparseHarvesterComponent,
    CkanHarvesterComponent,
    CswHarvesterComponent,
    OaiHarvesterComponent,
    DcatHarvesterComponent,
    SparqlHarvesterComponent,
    WfsHarvesterComponent,
    ImporterDetailComponent,
    ChipListComponent
  ],
    imports: [
        CommonModule,
        RouterModule.forChild(harvesterRoutes),
        FlexLayoutModule,
        SharedModule,
        MatDialogModule,
        MatButtonModule,
        MatCardModule,
        MatExpansionModule,
        MatIconModule,
        MatListModule,
        MatSnackBarModule,
        MatSlideToggleModule,
        MatProgressBarModule,
        MatProgressSpinnerModule,
        MatChipsModule,
        MatTabsModule,
        ReactiveFormsModule,
        MatCheckboxModule,
        MatBadgeModule,
        ScrollingModule
    ],
  exports: [
    HarvesterComponent
  ]
})
export class HarvesterModule {
}
