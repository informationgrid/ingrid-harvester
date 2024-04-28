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