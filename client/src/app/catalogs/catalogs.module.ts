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

import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { CatalogOverviewComponent } from "./catalog-overview/catalog-overview.component";
import { OverviewTemplateComponent } from "../shared/overview-template/overview-template.component";
import { TranslocoDirective } from "@ngneat/transloco";
import { MatButton } from "@angular/material/button";
import { MatIcon } from "@angular/material/icon";
import { CatalogEntryComponent } from "./catalog-entry/catalog-entry.component";
import { MatAccordion } from "@angular/material/expansion";
import { KeyValuePipe } from "@angular/common";

const routes: Routes = [
  {
    path: "",
    component: CatalogOverviewComponent,
  },
];

@NgModule({
  declarations: [CatalogOverviewComponent],
  imports: [
    RouterModule.forChild(routes),
    OverviewTemplateComponent,
    TranslocoDirective,
    MatButton,
    MatIcon,
    CatalogEntryComponent,
    MatAccordion,
    KeyValuePipe,
  ],
  exports: [CatalogOverviewComponent],
})
export class CatalogsModule {}
