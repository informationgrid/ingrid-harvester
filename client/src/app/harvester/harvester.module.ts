/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
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

import { ChipListComponent } from './dialog-edit/chip-list/chip-list.component';
import { CkanHarvesterComponent } from './dialog-edit/ckan-harvester/ckan-harvester.component';
import { CommonModule } from '@angular/common';
import { CronjobFormFieldComponent } from '../shared/cronjob-form-field/cronjob-form-field.component';
import { CswHarvesterComponent } from './dialog-edit/csw-harvester/csw-harvester.component';
import { DcatHarvesterComponent } from './dialog-edit/dcat-harvester/dcat-harvester.component';
import { DcatappluHarvesterComponent } from './dialog-edit/dcatapplu-harvester/dcatapplu-harvester.component';
import { DialogEditComponent } from './dialog-edit/dialog-edit.component';
import { DialogHistoryComponent } from './dialog-history/dialog-history.component';
import { DialogLogComponent } from './dialog-log/dialog-log.component';
import { DialogSchedulerComponent } from './dialog-scheduler/dialog-scheduler.component';
import { ExcelHarvesterComponent } from './dialog-edit/excel-harvester/excel-harvester.component';
import { ExcelSparseHarvesterComponent } from './dialog-edit/excel-sparse-harvester/excel-sparse-harvester.component';
import { HarvesterComponent } from './harvester.component';
import { ImporterDetailComponent } from './importer-detail/importer-detail.component';
import { KldHarvesterComponent } from './dialog-edit/kld-harvester/kld-harvester.component';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { NgModule } from '@angular/core';
import { OaiHarvesterComponent } from './dialog-edit/oai-harvester/oai-harvester.component';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { SharedModule } from '../shared/shared.module';
import { SparqlHarvesterComponent } from './dialog-edit/sparql-harvester/sparql-harvester.component';
import { WfsHarvesterComponent } from './dialog-edit/wfs-harvester/wfs-harvester.component';

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
        KldHarvesterComponent,
        OaiHarvesterComponent,
        DcatHarvesterComponent,
        DcatappluHarvesterComponent,
        SparqlHarvesterComponent,
        WfsHarvesterComponent,
        ImporterDetailComponent,
        ChipListComponent
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(harvesterRoutes),
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
        ScrollingModule,
        CronjobFormFieldComponent
    ],
    exports: [
        HarvesterComponent
    ]
})
export class HarvesterModule {
}
