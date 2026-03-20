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

import {Component, DestroyRef, inject, OnInit} from '@angular/core';
import {ActivatedRoute, NavigationEnd, Router} from "@angular/router";
import {SessionService, Tab} from "../services/session.service";
import {filter} from "rxjs";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.scss'],
  standalone: false
})
export class ConfigComponent implements OnInit {
  tabs: Tab[];
  private destroyRef = inject(DestroyRef);

  constructor(
    private router: Router,
    private activeRoute: ActivatedRoute,
    sessionService: SessionService,
  ) {
    this.tabs = sessionService.getTabsFromRoute(activeRoute.snapshot);
  }

  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.handleRedirection();
    });

    // Run redirection logic initially
    this.handleRedirection();
  }

  private handleRedirection() {
    // only update tab from route if it was set explicitly in URL
    // otherwise the remembered state from store is used
    const urlSegments = this.router.parseUrl(this.router.url).root.children.primary?.segments;
    if (urlSegments && urlSegments.length > 1 && urlSegments[0].path === 'config') {
      const currentPath = urlSegments[1].path;
      const activeTabIndex = this.tabs.findIndex(
        (tab) => tab.path === currentPath,
      );
      if (activeTabIndex !== -1) {
        this.updateTab(activeTabIndex);
      }
    } else if (this.tabs.length > 0) {
      // Redirect to the first available tab if no specific sub-route is provided
      this.router.navigate([this.tabs[0].path], {relativeTo: this.activeRoute});
    }
  }

  updateTab(index: number) {
    // const tabPaths = this.sessionService.getTabPaths(this.activeRoute.snapshot);
    // this.sessionService.updateCurrentTab("research", tabPaths[index]);
  }
}
