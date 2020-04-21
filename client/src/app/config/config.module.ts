import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ConfigComponent} from './config.component';
import {MatButtonModule} from "@angular/material/button";
import {RouterModule, Routes} from '@angular/router';
import {SharedModule} from '../shared/shared.module';
import {ReactiveFormsModule} from '@angular/forms';
import {MatTabsModule} from "@angular/material/tabs";
import { ConfigMappingComponent } from './config-mapping/config-mapping.component';
import { ConfigGeneralComponent } from './config-general/config-general.component';
import { ConfigImportExportComponent } from './config-import-export/config-import-export.component';
import {MatListModule} from "@angular/material/list";
import {MatIconModule} from "@angular/material/icon";
import { AddMappingItemComponent } from './config-mapping/add-mapping-item/add-mapping-item.component';
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {FlexModule} from "@angular/flex-layout";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MatCardModule} from "@angular/material/card";
import {MatCheckboxModule} from "@angular/material/checkbox";

const configRoutes: Routes = [
  {
    path: '',
    component: ConfigComponent
  }
];

@NgModule({
  declarations: [ConfigComponent, ConfigMappingComponent, ConfigGeneralComponent, ConfigImportExportComponent, AddMappingItemComponent],
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
    MatCheckboxModule
  ],
  exports: [
    ConfigComponent
  ],
  entryComponents: [AddMappingItemComponent]
})
export class ConfigModule { }
