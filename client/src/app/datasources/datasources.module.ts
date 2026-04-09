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
import { DialogEditComponent } from "./dialog-edit/dialog-edit.component";
import { DialogHistoryComponent } from "./dialog-history/dialog-history.component";
import { DialogJobsComponent } from "./dialog-jobs/dialog-jobs.component";
import { DialogLogComponent } from "./dialog-log/dialog-log.component";
import { DialogSchedulerComponent } from "./dialog-scheduler/dialog-scheduler.component";
import { DatasourceOverviewComponent } from "./datasource-overview/datasource-overview.component";
import { ContextHelpDirective } from "../shared/context-help/context-help.directive";
import { MatTooltip } from "@angular/material/tooltip";
import { MatGridList, MatGridTile } from "@angular/material/grid-list";
import { ContextHelpButtonComponent } from "../shared/context-help/context-help-button/context-help-button.component";
import { TranslocoDirective } from "@ngneat/transloco";
import { MatMenu, MatMenuItem, MatMenuTrigger } from "@angular/material/menu";
import { DialogHeaderComponent } from "../shared/dialog-header/dialog-header.component";
import { DatasourceEntryComponent } from "./datasource-entry/datasource-entry.component";
import { OverviewTemplateComponent } from "../shared/overview-template/overview-template.component";
import { FormlyForm } from "@ngx-formly/core";
import {
  CircularProgressIndicatorComponent
} from "../shared/circular-progress-indicator/circular-progress-indicator.component";
import { StatusLabelComponent } from "../shared/status-label/status-label.component";
import { DetailItemComponent } from "../shared/detail-item/detail-item.component";
import { CdkDrag, CdkDragHandle } from "@angular/cdk/drag-drop";
import { JobEntryComponent } from "./dialog-jobs/job-entry/job-entry.component";

const routes: Routes = [
  {
    path: "",
    component: DatasourceOverviewComponent,
  },
];

@NgModule({
  declarations: [
    DatasourceOverviewComponent,
    DialogSchedulerComponent,
    DialogLogComponent,
    DialogEditComponent,
    DialogHistoryComponent,
    DialogJobsComponent,
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
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
    MatMenu,
    MatMenuTrigger,
    MatMenuItem,
    DialogHeaderComponent,
    DatasourceEntryComponent,
    OverviewTemplateComponent,
    FormlyForm,
    CircularProgressIndicatorComponent,
    StatusLabelComponent,
    DetailItemComponent,
    CdkDrag,
    CdkDragHandle,
    JobEntryComponent,
  ],
  exports: [DatasourceOverviewComponent],
})
export class DatasourcesModule {}
