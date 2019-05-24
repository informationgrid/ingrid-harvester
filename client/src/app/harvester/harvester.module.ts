import {NgModule} from "@angular/core";
import {HarvesterComponent} from "./harvester.component";
import {NoopAnimationsModule} from "@angular/platform-browser/animations";
import {
  MatButtonModule,
  MatDialogModule,
  MatExpansionModule,
  MatIconModule,
  MatInputModule,
  MatSelectModule,
  MatSlideToggleModule,
  MatSnackBarModule
} from "@angular/material";
import {CommonModule} from "@angular/common";
import {DialogSchedulerComponent} from './dialog-scheduler/dialog-scheduler.component';
import {CronEditorModule} from "./cron-editor/cron-editor.module";
import {DialogLogComponent} from './dialog-log/dialog-log.component';
import {DialogEditComponent} from './dialog-edit/dialog-edit.component';
import {ImportNotifyComponent} from "./notifications/import-notify.component";
import {FormsModule} from "@angular/forms";
import {ExcelHarvesterComponent} from './dialog-edit/excel-harvester/excel-harvester.component';
import {CkanHarvesterComponent} from './dialog-edit/ckan-harvester/ckan-harvester.component';
import {CswHarvesterComponent} from './dialog-edit/csw-harvester/csw-harvester.component';

@NgModule({
  declarations: [
    HarvesterComponent,
    DialogSchedulerComponent,
    DialogLogComponent,
    DialogEditComponent,
    ImportNotifyComponent,
    ExcelHarvesterComponent,
    CkanHarvesterComponent,
    CswHarvesterComponent
  ],
  imports: [
    CommonModule,
    NoopAnimationsModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatExpansionModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
    MatSelectModule,
    MatSlideToggleModule,
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
