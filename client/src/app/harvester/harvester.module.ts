import {NgModule} from "@angular/core";
import {HarvesterComponent} from "./harvester.component";
import {MatButtonModule} from "@angular/material/button";
import {MatDialogModule} from "@angular/material/dialog";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatIconModule} from "@angular/material/icon";
import {MatProgressBarModule} from "@angular/material/progress-bar";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {CommonModule} from "@angular/common";
import {DialogSchedulerComponent} from './dialog-scheduler/dialog-scheduler.component';
import {CronEditorModule} from "./cron-editor/cron-editor.module";
import {DialogLogComponent} from './dialog-log/dialog-log.component';
import {DialogEditComponent} from './dialog-edit/dialog-edit.component';
import {ImportNotifyComponent} from "./notifications/import-notify.component";
import {ExcelHarvesterComponent} from './dialog-edit/excel-harvester/excel-harvester.component';
import {CkanHarvesterComponent} from './dialog-edit/ckan-harvester/ckan-harvester.component';
import {CswHarvesterComponent} from './dialog-edit/csw-harvester/csw-harvester.component';
import {ImporterDetailComponent} from './importer-detail/importer-detail.component';
import {FlexLayoutModule} from "@angular/flex-layout";
import {MatCardModule, MatChipsModule, MatListModule} from "@angular/material";
import {RouterModule, Routes} from '@angular/router';
import {SharedModule} from '../shared/shared.module';

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
    ImportNotifyComponent,
    ExcelHarvesterComponent,
    CkanHarvesterComponent,
    CswHarvesterComponent,
    ImporterDetailComponent
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
    CronEditorModule
  ],
  entryComponents: [
    DialogSchedulerComponent,
    DialogLogComponent,
    DialogEditComponent,
    ImportNotifyComponent
  ],
  exports: [
    HarvesterComponent
  ]
})
export class HarvesterModule {
}
