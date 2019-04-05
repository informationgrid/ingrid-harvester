import {NgModule} from "@angular/core";
import {HarvesterComponent} from "./harvester.component";
import {NoopAnimationsModule} from "@angular/platform-browser/animations";
import {MatButtonModule, MatCardModule, MatDialogModule, MatExpansionModule, MatIconModule} from "@angular/material";
import {CommonModule} from "@angular/common";
import {DialogSchedulerComponent} from './dialog-scheduler/dialog-scheduler.component';
import {CronEditorModule} from "./cron-editor/cron-editor.module";
import { DialogLogComponent } from './dialog-log/dialog-log.component';
import { DialogEditComponent } from './dialog-edit/dialog-edit.component';

@NgModule({
  declarations: [
    HarvesterComponent,
    DialogSchedulerComponent,
    DialogLogComponent,
    DialogEditComponent
  ],
  imports: [
    CommonModule,
    NoopAnimationsModule,
    MatDialogModule,
    MatButtonModule,
    // MatCardModule,
    MatExpansionModule,
    MatIconModule,
    CronEditorModule
  ],
  entryComponents: [
    DialogSchedulerComponent,
    DialogLogComponent,
    DialogEditComponent
  ],
  exports: [
    HarvesterComponent
  ]
})
export class HarvesterModule {
}
