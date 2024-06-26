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

import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ActivatedRouteSnapshot } from "@angular/router";


// the values must match with the actual route!
export type TabPage = "config"; // | "harvester" | "indices" | "dashboard";

export interface Tab {
  label: string;
  path: string;
  params?: string;
}

@Injectable({
  providedIn: "root",
})
export class SessionService {
  constructor(

  ) {}



  getTabsFromRoute(activeRoute: ActivatedRouteSnapshot): Tab[] {
    console.log("sessions routes: " + activeRoute)
    return activeRoute.routeConfig.children
      .filter((item) => item.path)
    //   .filter((item) => this.configService.hasPermission(item.data?.permission))
      .map((item) => ({
        label: item.data.title,
        path: item.path,
      }));
  }

  getTabPaths(activeRoute: ActivatedRouteSnapshot) {
    return activeRoute.routeConfig.children
      .filter((item) => item.path)
      .map((item) => item.path);
  }
}