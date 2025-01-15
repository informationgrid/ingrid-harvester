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

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslocoModule } from '@ngneat/transloco';
import { CronjobFormFieldComponent } from '../shared/cronjob-form-field/cronjob-form-field.component';
import { PageTemplateModule } from '../shared/page-template/page-template.module';
import { SharedModule } from '../shared/shared.module';
import { AddOrEditCatalogComponent } from './config-catalogs/add-or-edit-catalog/add-or-edit-catalog.component';
import { ConfigCatalogsComponent } from './config-catalogs/config-catalogs.component';
import { DeleteCatalogComponent } from './config-catalogs/delete-catalog/delete-catalog.component';
import { ConfigGeneralComponent } from './config-general/config-general.component';
import { ConfigImportExportComponent } from './config-import-export/config-import-export.component';
import { AddMappingItemComponent } from './config-mapping/add-mapping-item/add-mapping-item.component';
import { ConfigMappingComponent } from './config-mapping/config-mapping.component';
import { ConfigComponent } from './config.component';
import { routing } from './config.routing';

@NgModule({
    declarations: [
        ConfigComponent, 
        ConfigMappingComponent, 
        ConfigGeneralComponent, 
        ConfigImportExportComponent, 
        ConfigCatalogsComponent, 
        AddMappingItemComponent,
        AddOrEditCatalogComponent,
        DeleteCatalogComponent
    ],
    imports: [
        CommonModule,
        SharedModule,
        MatButtonModule,
        ReactiveFormsModule,
        MatTabsModule,
        MatListModule,
        MatIconModule,
        MatAutocompleteModule,
        MatSlideToggleModule,
        MatCardModule,
        MatCheckboxModule,
        MatRadioModule,
        routing,
        TranslocoModule,
        PageTemplateModule,
        CronjobFormFieldComponent
    ],
    exports: [
        ConfigComponent
    ],
    providers: [
    ]
})
export class ConfigModule { }
