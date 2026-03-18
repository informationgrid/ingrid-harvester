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

import {Component, OnInit} from '@angular/core';
import {FormControl, FormGroup, UntypedFormGroup, Validators} from '@angular/forms';
import {AuthenticationService} from './authentication.service';
import {Router} from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';
import {catchError, of} from 'rxjs';
import {ConfigService} from '../config.service';
import {AuthMethod} from "./AuthStrategy";

@Component({
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: false
})
export class LoginComponent implements OnInit {

  form: FormGroup = new FormGroup({
    username: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required]),
  });
  showErrorMessage = false;
  passportEnabled = true;
  keycloakEnabled = true;

  constructor(private router: Router, private authService: AuthenticationService, private configService: ConfigService) {
  }

  ngOnInit(): void {
    this.passportEnabled = this.configService.config.passportEnabled !== false;
    this.keycloakEnabled = this.configService.config.keycloakEnabled !== false;

    this.authService.currentUser.subscribe({
      next: (user) => {
        if (user) {
          this.router.navigate(['/']);
        }
      }
    });
  }

  submit() {
    if (this.form.valid) {
      this.authService.login(this.form.get('username').value, this.form.get('password').value, AuthMethod.LOCAL)
        .pipe(
          catchError((error: HttpErrorResponse) => {
            console.error('Error logging in:', error);
            if (error.status === 404) {
              this.showErrorMessage = true;
            }
            return of(null);
          })
        )
        .subscribe((response) => {
            if (response) {
              this.router.navigate(['/']);
            }
        });
    }
  }

  loginWithKeycloak() {
    this.authService.login(null, null, AuthMethod.KEYCLOAK)
      .pipe(
        catchError((error) => {
          console.error('Error during Keycloak login', error);
          this.showErrorMessage = true;
          return of(null);
        })
      )
      .subscribe();
  }
}
