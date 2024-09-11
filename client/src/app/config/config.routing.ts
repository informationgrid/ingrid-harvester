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

import { RouterModule } from "@angular/router";
import { ConfigComponent } from "./config.component";
import { ConfigGeneralComponent } from "./config-general/config-general.component";
import { ConfigMappingComponent } from "./config-mapping/config-mapping.component";
import { ConfigImportExportComponent } from "./config-import-export/config-import-export.component";

export const routing = RouterModule.forChild([
  {
    path: "",
    component: ConfigComponent,
    children: [
      {
        path: "",
        redirectTo: "general",
        pathMatch: "full",
      },
      {
        path: "general",
        component: ConfigGeneralComponent,
        data: {
          title: "Konfiguration",
          tabIdentifier: "general",
        },
      },
      {
        path: "mapping",
        component: ConfigMappingComponent,
        data: {
          title: "Mapping (Datenformate)",
        },
      },
      {
        path: "import-export",
        component: ConfigImportExportComponent,
        data: {
          title: "Import/Export",
        },
      },
    ],
  },
]);