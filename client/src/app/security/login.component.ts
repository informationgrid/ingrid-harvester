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

import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ConfigService } from '../config.service';
import { AuthenticationService } from './authentication.service';
import { AuthMethod } from './AuthStrategy';

@Component({
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.scss"],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class LoginComponent implements OnInit {
  private static readonly REASONS = ["no_permission", "keycloak", "session"];

  form: FormGroup = new FormGroup({
    username: new FormControl("", [Validators.required]),
    password: new FormControl("", [Validators.required]),
  });
  showErrorMessage = false;
  error: string | null = null;
  passportEnabled = true;
  keycloakEnabled = true;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthenticationService,
    private configService: ConfigService,
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.error = LoginComponent.REASONS.includes(params["error"]) ? params["error"] : null;
    });

    this.passportEnabled = this.configService.config.passportEnabled !== false;
    this.keycloakEnabled = this.configService.config.keycloakEnabled !== false;

    this.authService.currentUser.subscribe({
      next: (user) => {
        if (user) {
          this.router.navigate(["/"]);
        }
      },
    });
  }

  submit() {
    if (this.form.valid) {
      this.authService
        .login(
          this.form.get("username").value,
          this.form.get("password").value,
          AuthMethod.LOCAL,
        )
        .pipe(
          catchError((error: HttpErrorResponse) => {
            console.error("Error logging in:", error);
            if (error.status === 404) {
              this.showErrorMessage = true;
            }
            return of(null);
          }),
        )
        .subscribe((response) => {
          if (response) {
            this.router.navigate(["/"]);
          }
        });
    }
  }

  loginWithKeycloak() {
    this.authService
      .login(null, null, AuthMethod.KEYCLOAK)
      .pipe(
        catchError((error) => {
          console.error("Error during Keycloak login", error);
          this.showErrorMessage = true;
          return of(null);
        }),
      )
      .subscribe();
  }
}
