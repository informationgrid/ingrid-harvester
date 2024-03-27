/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
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

import {APP_INITIALIZER, LOCALE_ID, NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ConfigComponent} from './config.component';
import {MatButtonModule} from "@angular/material/button";
import {Router, RouterModule, Routes} from '@angular/router';
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
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MatCardModule} from "@angular/material/card";
import {MatCheckboxModule} from "@angular/material/checkbox";
import { routing } from "./config.routing";
import { TranslocoModule, TranslocoService } from "@ngneat/transloco";
import { ConfigLoader } from '../app.module';
import { ConfigService } from '../config.service';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { UnauthorizedInterceptor } from '../security/unauthorized.interceptor';
import { AuthenticationService } from '../security/authentication.service';
import { PageTemplateModule } from "../shared/page-template/page-template.module"
import { CronjobFormFieldComponent } from '../shared/cronjob-form-field/cronjob-form-field.component'

@NgModule({
    declarations: [
        ConfigComponent, 
        ConfigMappingComponent, 
        ConfigGeneralComponent, 
        ConfigImportExportComponent, 
        AddMappingItemComponent
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
