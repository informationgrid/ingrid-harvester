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

import {Input, Component, Output, EventEmitter, OnInit} from '@angular/core';
import { UntypedFormGroup, UntypedFormControl } from '@angular/forms';
import {AuthenticationService, AuthMethod} from './authentication.service';
import {Router} from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';

@Component({
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  form: UntypedFormGroup = new UntypedFormGroup({
    username: new UntypedFormControl(''),
    password: new UntypedFormControl(''),
  });
  showErrorMessage = false;

  constructor(private router: Router, private authService: AuthenticationService) {
  }

  ngOnInit(): void {
    // Initialize Keycloak
    /*this.authService.initKeycloak().catch(error => {
      console.error('Error initializing Keycloak', error);
    });*/

    this.authService.currentUser.subscribe(user => {
      if (user) {
        this.router.navigate(['/']);
      }
    });
  }

  submit() {
    if (this.form.valid) {
      this.authService.login(this.form.get('username').value, this.form.get('password').value).subscribe(response => {
        console.log('Response', response);
        this.router.navigate(['/']);
      }, (error: HttpErrorResponse) => {
        console.log('Error logging in:', error);
        if (error.status === 404) {
          this.showErrorMessage = true;
        }
      });
    }
  }

  loginWithKeycloak() {
    this.showErrorMessage = false;
    this.authService.login(null, null, AuthMethod.KEYCLOAK).subscribe(
      response => {
        if (response) {
          console.log('Keycloak login successful', response);
          this.router.navigate(['/']);
        } else {
          console.error('Keycloak login failed');
          this.showErrorMessage = true;
        }
      },
      error => {
        console.error('Error during Keycloak login', error);
        this.showErrorMessage = true;
      }
    );
  }
}
