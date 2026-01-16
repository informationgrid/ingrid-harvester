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

import { Component, computed, OnInit } from '@angular/core';
import {AuthenticationService} from './security/authentication.service';
import {Router, NavigationEnd} from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ConfigService} from "./config.service";
import { TranslocoService } from "@ngneat/transloco";
import { combineLatest } from 'rxjs';
import { DomSanitizer, Title } from "@angular/platform-browser";
import { MatIconRegistry } from "@angular/material/icon";

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: false
})
export class AppComponent implements OnInit {
  isLoggedIn = false;
  isLoggingout = false;
  version = this.configService.config$;
  favIcon: HTMLLinkElement = document.querySelector("#appIcon");

  constructor(
    private router: Router,
    private authService: AuthenticationService,
    private snack: MatSnackBar,
    private configService: ConfigService,
    private transloco: TranslocoService,
    private domSanitizer: DomSanitizer,
    private titleService: Title,
    private registry: MatIconRegistry,
    ) {
      this.loadIcons();

      const profile = "ingrid"
      if (profile == "ingrid") {
        this.favIcon.href = "./assets/icons/favicon.ico";
        titleService.setTitle("InGrid Harvester");
      }
  }

  private loadIcons() {
    let paths = [
      "assets/icons/icon-navigation.svg",
      "assets/icons/icon-doc-types.svg",
      "assets/icons/icon-toolbar.svg",
      "assets/icons/icon-general.svg",
      "assets/icons/icon-button.svg",
      "assets/images/banner.svg",
    ];
    for (let path of paths) {
      // useful tool for merging SVG files: merge-svg-files via npm
      this.registry.addSvgIconSet(this.domSanitizer.bypassSecurityTrustResourceUrl(path));
    }
  }

  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => {
      this.isLoggedIn = user !== null;
    });

    combineLatest([
      this.transloco.selectTranslation(),
      this.router.events,
    ]).subscribe(([_, event]) => {
      if (event instanceof NavigationEnd) {
        const mainTitle = this.transloco.translate("pageTitle.default");
        const splittedByParams = this.router.url.split(";");
        const mappedPath = splittedByParams[0].split("/").slice(2).join(".");
        const key = `pageTitle.${mappedPath}`;
        const pageTitle = this.transloco.translate(key);
        let newTitle = mainTitle;
        if (key !== pageTitle) {
          newTitle = pageTitle + " | " + mainTitle;
        }
        this.titleService.setTitle(newTitle);
      }
    });

  }

  logout() {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['login']);
      this.snack.open('Sie wurden ausgeloggt', null, {duration: 3000});
    });
  }
}
