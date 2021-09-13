/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2021 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.1 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  http://ec.europa.eu/idabc/eupl5
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

import {Input, Component, Output, EventEmitter, OnInit} from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import {AuthenticationService} from './authentication.service';
import {Router} from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';

@Component({
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  form: FormGroup = new FormGroup({
    username: new FormControl(''),
    password: new FormControl(''),
  });
  showErrorMessage = false;

  constructor(private router: Router, private authService: AuthenticationService) {
  }

  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => {
      if (user) {
        this.router.navigate(['/']);
      }
    })
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
}
