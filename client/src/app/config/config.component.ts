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

import {Component, Injectable, OnInit} from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot, Router } from "@angular/router";
import { routing } from './config.routing';
import { SessionService, Tab } from "../services/session.service";

@Component({
    selector: 'app-config',
    templateUrl: './config.component.html',
    styleUrls: ['./config.component.scss'],
    standalone: false
})
export class ConfigComponent implements OnInit {
  tabs: Tab[];

  constructor(
    private router: Router,
    private activeRoute: ActivatedRoute,
    private sessionService: SessionService,
    ) {
      this.tabs = sessionService.getTabsFromRoute(activeRoute.snapshot);
      // only update tab from route if it was set explicitly in URL
      // otherwise the remembered state from store is used
      const currentPath = this.router.parseUrl(this.router.url).root.children
        .primary.segments[1].path;
      const activeTabIndex = this.tabs.findIndex(
        (tab) => tab.path === currentPath,
      );
      if (activeTabIndex !== 0) {
        this.updateTab(activeTabIndex);
      }
  }

  ngOnInit() {
  }



  updateTab(index: number) {
    // const tabPaths = this.sessionService.getTabPaths(this.activeRoute.snapshot);
    // this.sessionService.updateCurrentTab("research", tabPaths[index]);
  }
}
