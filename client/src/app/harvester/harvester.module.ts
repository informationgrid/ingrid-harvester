import {NgModule} from "@angular/core";
import {HarvesterComponent} from "./harvester.component";
import {NoopAnimationsModule} from "@angular/platform-browser/animations";
import { MatButtonModule } from "@angular/material/button";
import { MatDialogModule } from "@angular/material/dialog";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSelectModule } from "@angular/material/select";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatSnackBarModule } from "@angular/material/snack-bar";
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
import { ImporterDetailComponent } from './importer-detail/importer-detail.component';

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
    MatProgressBarModule,
    MatProgressSpinnerModule,
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
