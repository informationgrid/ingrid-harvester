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

import { Component, inject, output, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute, NavigationEnd, Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { TranslocoService } from "@ngneat/transloco";
import { filter, switchMap } from "rxjs";
import { ConfigService } from "../config.service";

type VersionInfo = {
  version: string;
  buildDate: string;
  commitId: string;
};

@Component({
  selector: "ige-main-header",
  templateUrl: "./main-header.component.html",
  styleUrl: "./main-header.component.scss",
  standalone: false,
})
export class MainHeaderComponent {
  onLogout = output<void>();
  onSideMenuToggle = output<void>();

  pageTitle = signal<string>(undefined);
  versionInfo = toSignal(inject(HttpClient).get<VersionInfo>('rest/api/version'));

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private transloco: TranslocoService,
    private configService: ConfigService,
  ) {}

  ngOnInit() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        switchMap(() => this.route.firstChild?.title),
      )
      .subscribe((title) => {
        this.pageTitle.set(this.transloco.translate(title));
      });
  }
}
