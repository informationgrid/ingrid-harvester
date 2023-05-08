/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
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

import {Component, OnInit} from '@angular/core';
import {AuthenticationService} from './security/authentication.service';
import {Router} from '@angular/router';
import {MatLegacySnackBar as MatSnackBar} from '@angular/material/legacy-snack-bar';
import {ConfigService} from "./config.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  isLoggedIn = false;
  version = this.configService.config$;

  constructor(private router: Router, private authService: AuthenticationService, private snack: MatSnackBar,
              private configService: ConfigService) {

  }

  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => {
      this.isLoggedIn = user !== null;
    });
  }

  logout() {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['login']);
      this.snack.open('Sie wurden ausgeloggt', null, {duration: 3000});
    });
  }
}
