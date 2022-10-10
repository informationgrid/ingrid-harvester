/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2022 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {IndicesListComponent} from './indices-list/indices-list.component';
import {RouterModule, Routes} from '@angular/router';
import {MatIconModule, MatListModule, MatCardModule} from '@angular/material';
import {SharedModule} from '../shared/shared.module';
import {FlexLayoutModule} from "@angular/flex-layout";
import { ScrollingModule } from '@angular/cdk/scrolling';

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
    FlexLayoutModule,
    MatListModule,
    MatIconModule,
    MatCardModule,
    SharedModule,
    ScrollingModule
  ]
})
export class IndicesModule {
}
