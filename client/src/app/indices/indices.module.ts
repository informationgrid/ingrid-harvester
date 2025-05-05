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

import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {IndicesListComponent} from './indices-list/indices-list.component';
import {RouterModule, Routes} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {MatListModule} from '@angular/material/list';
import {MatCardModule} from '@angular/material/card';
import {SharedModule} from '../shared/shared.module';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { PageTemplateModule } from '../shared/page-template/page-template.module';
import { MatMenuModule } from '@angular/material/menu';
import {ContextHelpDirective} from "../shared/context-help/context-help.directive";
import {MatTooltip} from "@angular/material/tooltip";
import {ContextHelpButtonComponent} from "../shared/context-help/context-help-button/context-help-button.component";

const routes: Routes = [
  {
    path: '',
    component: IndicesListComponent
  }
];

@NgModule({
  declarations: [IndicesListComponent],
    imports: [
        CommonModule,
        RouterModule.forChild(routes),
        MatListModule,
        MatIconModule,
        MatCardModule,
        SharedModule,
        ScrollingModule,
        PageTemplateModule,
        MatMenuModule,
        ContextHelpDirective,
        MatTooltip,
        ContextHelpButtonComponent
    ]
})
export class IndicesModule {
}
