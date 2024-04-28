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