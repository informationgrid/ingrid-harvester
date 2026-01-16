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

import { ScrollingModule } from "@angular/cdk/scrolling";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatBadgeModule } from "@angular/material/badge";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatChipsModule } from "@angular/material/chips";
import { MatDialogModule } from "@angular/material/dialog";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatIconModule } from "@angular/material/icon";
import { MatListModule } from "@angular/material/list";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatTabsModule } from "@angular/material/tabs";
import { RouterModule, Routes } from "@angular/router";
import { CronjobFormFieldComponent } from "../shared/cronjob-form-field/cronjob-form-field.component";
import { SharedModule } from "../shared/shared.module";
import { ChipListComponent } from "./dialog-edit/chip-list/chip-list.component";
import { CkanHarvesterComponent } from "./dialog-edit/ckan-harvester/ckan-harvester.component";
import { CswHarvesterComponent } from "./dialog-edit/csw-harvester/csw-harvester.component";
import { DcatHarvesterComponent } from "./dialog-edit/dcat-harvester/dcat-harvester.component";
import { DcatappluHarvesterComponent } from "./dialog-edit/dcatapplu-harvester/dcatapplu-harvester.component";
import { DialogEditComponent } from "./dialog-edit/dialog-edit.component";
import { ExcelHarvesterComponent } from "./dialog-edit/excel-harvester/excel-harvester.component";
import { ExcelSparseHarvesterComponent } from "./dialog-edit/excel-sparse-harvester/excel-sparse-harvester.component";
import { JsonHarvesterComponent } from "./dialog-edit/json-harvester/json-harvester.component";
import { KldHarvesterComponent } from "./dialog-edit/kld-harvester/kld-harvester.component";
import { OaiHarvesterComponent } from "./dialog-edit/oai-harvester/oai-harvester.component";
import { SparqlHarvesterComponent } from "./dialog-edit/sparql-harvester/sparql-harvester.component";
import { WfsHarvesterComponent } from "./dialog-edit/wfs-harvester/wfs-harvester.component";
import { DialogHistoryComponent } from "./dialog-history/dialog-history.component";
import { DialogLogComponent } from "./dialog-log/dialog-log.component";
import { DialogSchedulerComponent } from "./dialog-scheduler/dialog-scheduler.component";
import { HarvesterComponent } from "./harvester.component";
import { ImporterDetailComponent } from "./importer-detail/importer-detail.component";
import { ContextHelpDirective } from "../shared/context-help/context-help.directive";
import { MatTooltip } from "@angular/material/tooltip";
import { MatGridList, MatGridTile } from "@angular/material/grid-list";
import { ContextHelpButtonComponent } from "../shared/context-help/context-help-button/context-help-button.component";
import { TranslocoDirective } from "@ngneat/transloco";
import { StatIndicatorComponent } from "../shared/stat-indicator/stat-indicator.component";

const harvesterRoutes: Routes = [
  {
    path: "",
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
    JsonHarvesterComponent,
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
    CronjobFormFieldComponent,
    MatAutocompleteModule,
    ContextHelpDirective,
    MatTooltip,
    MatGridList,
    MatGridTile,
    ContextHelpButtonComponent,
    TranslocoDirective,
    StatIndicatorComponent
  ],
  exports: [
    HarvesterComponent
  ]
})
export class HarvesterModule {
}
