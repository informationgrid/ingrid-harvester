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

import { Component, OnInit } from "@angular/core";
import { Observable, map } from "rxjs";
import { NavigationEnd, Route, Router } from "@angular/router";
import { animate, style, transition, trigger } from "@angular/animations";
import { MainMenuService } from "../menu/main-menu.service";

@Component({
    selector: 'ige-side-menu',
    templateUrl: './side-menu.component.html',
    styleUrl: './side-menu.component.scss',
    animations: [
        trigger("toggle", [
            transition("collapsed => expanded", [
                style({ width: 56 }),
                animate("300ms ease-in", style({ width: 300 })),
            ]),
            transition("* => collapsed", [
                style({ width: 300 }),
                animate("300ms ease-out", style({ width: 56 })),
            ]),
        ]),
    ],
    standalone: false
})
export class SideMenuComponent {

  showDrawer: Observable<boolean>;

  menuItems: Observable<Route[]> = this.menuService.menu$.pipe(
    map((routes) => routes.filter((route) => route.data.partOfMenu == true)),
  );

  menuIsExpanded = true;

  currentRoute: string;
  toggleState = "collapsed";
  private collapsed = false;
  titleCollapsButton = "Verkleinern"

  constructor(
    private router: Router,
    private menuService: MainMenuService,
  ) {}

  ngOnInit() {
    this.router.events.subscribe((event) => this.handleCurrentRoute(event));

    // // display the drawer if the user has at least one catalog assigned
    // this.showDrawer = this.configService.$userInfo.pipe(
    //   map((info) => info?.assignedCatalogs?.length > 0),
    // );
  }

  private handleCurrentRoute(event: any) {
    if (event instanceof NavigationEnd) {
      const urlPath = event.urlAfterRedirects.split(";")[0].substring(1);
      this.currentRoute = urlPath === "" ? "dashboard" : urlPath;
    }
  }

  toggleSidebar() {
    this.menuIsExpanded = !this.menuIsExpanded
  }

  gotoPage(path: string) {
    this.router.navigate([ "/" + path, ]);
  }
}