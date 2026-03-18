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

import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, of} from 'rxjs';
import {map, tap} from 'rxjs/operators';
import {AuthMethod, AuthStrategy} from './authentication.service';

@Injectable({providedIn: 'root'})
export class PassportService implements AuthStrategy {

  private http = inject(HttpClient);

  private get currentUserValue() {
    return JSON.parse(localStorage.getItem('currentUser'));
  }

  isAuthenticated(): Observable<boolean> {
    return of(!!this.currentUserValue);
  }

  getRoles(): string[] {
    const user = this.currentUserValue;
    return (user && user.roles) || [];
  }

  hasRole(role: string): boolean {
    const roles = this.getRoles();
    return roles.includes(role);
  }

  login(username: string, password: string): Observable<any> {
    return this.http.post<any>(`/rest/passport/login`, {username, password})
      .pipe(map(user => {
        // store user details and jwt token in local storage to keep user logged in between page refreshes
        user.authMethod = AuthMethod.LOCAL;
        localStorage.setItem('currentUser', JSON.stringify(user));
        return user;
      }));
  }

  logout(): Observable<any> {
    return this.http.get('/rest/passport/logout', {responseType: 'text'}).pipe(
      tap(() => {
        localStorage.removeItem('currentUser');
      })
    );
  }
}
