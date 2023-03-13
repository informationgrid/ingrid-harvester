/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or – as soon they will be
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

import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ConfigComponent} from './config.component';
import {MatLegacyButtonModule as MatButtonModule} from "@angular/material/legacy-button";
import {RouterModule, Routes} from '@angular/router';
import {SharedModule} from '../shared/shared.module';
import {ReactiveFormsModule} from '@angular/forms';
import {MatLegacyTabsModule as MatTabsModule} from "@angular/material/legacy-tabs";
import { ConfigMappingComponent } from './config-mapping/config-mapping.component';
import { ConfigGeneralComponent } from './config-general/config-general.component';
import { ConfigImportExportComponent } from './config-import-export/config-import-export.component';
import {MatLegacyListModule as MatListModule} from "@angular/material/legacy-list";
import {MatIconModule} from "@angular/material/icon";
import { AddMappingItemComponent } from './config-mapping/add-mapping-item/add-mapping-item.component';
import {MatLegacyAutocompleteModule as MatAutocompleteModule} from "@angular/material/legacy-autocomplete";
import {FlexModule} from "@angular/flex-layout";
import {MatLegacySlideToggleModule as MatSlideToggleModule} from "@angular/material/legacy-slide-toggle";
import {MatLegacyCardModule as MatCardModule} from "@angular/material/legacy-card";
import {MatLegacyCheckboxModule as MatCheckboxModule} from "@angular/material/legacy-checkbox";

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
    ]
})
export class ConfigModule { }
