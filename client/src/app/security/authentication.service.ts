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

import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable, from, of} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {catchError, map, switchMap, tap} from 'rxjs/operators';
import {KeycloakService} from './keycloak.service';

export enum AuthMethod {
  LOCAL = 'local',
  KEYCLOAK = 'keycloak'
}

@Injectable({providedIn: 'root'})
export class AuthenticationService {
  private currentUserSubject: BehaviorSubject<any>;
  public currentUser: Observable<any>;
  private authMethod: AuthMethod = AuthMethod.LOCAL;

  constructor(
    private http: HttpClient,
    private keycloakService: KeycloakService
  ) {
    this.currentUserSubject = new BehaviorSubject<any>(JSON.parse(localStorage.getItem('currentUser')));
    this.currentUser = this.currentUserSubject.asObservable();

    // Check if user is already authenticated with Keycloak
    this.keycloakService.isAuthenticated().subscribe(authenticated => {
      if (authenticated) {
        this.authMethod = AuthMethod.KEYCLOAK;
        const user = {
          username: this.keycloakService.getUsername(),
          authMethod: AuthMethod.KEYCLOAK
        };
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
      }
    });
  }

  public get currentUserValue() {
    return this.currentUserSubject.value;
  }

  public get currentAuthMethod() {
    return this.authMethod;
  }

  login(username, password, authMethod = AuthMethod.LOCAL) {
    if (authMethod === AuthMethod.KEYCLOAK) {
      return from(this.keycloakService.login()).pipe(
        switchMap(() => this.keycloakService.isAuthenticated()),
        map(authenticated => {
          if (authenticated) {
            this.authMethod = AuthMethod.KEYCLOAK;
            const user = {
              username: this.keycloakService.getUsername(),
              authMethod: AuthMethod.KEYCLOAK
            };
            localStorage.setItem('currentUser', JSON.stringify(user));
            this.currentUserSubject.next(user);
            return user;
          } else {
            throw new Error('Keycloak authentication failed');
          }
        }),
        catchError(error => {
          console.error('Keycloak login error', error);
          return of(null);
        })
      );
    } else {
      // Local authentication
      return this.http.post<any>(`rest/passport/login`, {username, password})
        .pipe(map(user => {
          // store user details and jwt token in local storage to keep user logged in between page refreshes
          user.authMethod = AuthMethod.LOCAL;
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.authMethod = AuthMethod.LOCAL;
          this.currentUserSubject.next(user);
          return user;
        }));
    }
  }

  logout(): Observable<any> {
    if (this.authMethod === AuthMethod.KEYCLOAK) {
      return from(this.keycloakService.logout()).pipe(
        tap(() => {
          localStorage.removeItem('currentUser');
          this.currentUserSubject.next(null);
        }),
        catchError(error => {
          console.error('Keycloak logout error', error);
          localStorage.removeItem('currentUser');
          this.currentUserSubject.next(null);
          return of(null);
        })
      );
    } else {
      // Local logout
      return this.http.get('rest/passport/logout', {responseType: 'text'}).pipe(
        tap(() => {
          localStorage.removeItem('currentUser');
          this.currentUserSubject.next(null);
        })
      );
    }
    // return of(null);
  }

  initKeycloak(): Promise<boolean> {
    return this.keycloakService.init();
  }
}
