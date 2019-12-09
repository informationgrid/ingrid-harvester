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
import {CkanHarvesterComponent} from './dialog-edit/ckan-harvester/ckan-harvester.component';
import {CswHarvesterComponent} from './dialog-edit/csw-harvester/csw-harvester.component';
import {ImporterDetailComponent} from './importer-detail/importer-detail.component';
import {FlexLayoutModule} from "@angular/flex-layout";
import {MatCardModule, MatCheckboxModule, MatChipsModule, MatListModule, MatTabsModule} from '@angular/material';
import {RouterModule, Routes} from '@angular/router';
import {SharedModule} from '../shared/shared.module';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {ReactiveFormsModule} from '@angular/forms';
import {ChipListComponent} from './dialog-edit/chip-list/chip-list.component';

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
    ExcelHarvesterComponent,
    CkanHarvesterComponent,
    CswHarvesterComponent,
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
        MatCheckboxModule
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
