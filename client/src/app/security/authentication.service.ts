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
import {BehaviorSubject, Observable, of} from 'rxjs';
import {catchError, map, tap} from 'rxjs/operators';
import {KeycloakService} from './keycloak.service';
import {PassportService} from './passport.service';
import {AuthMethod, AuthStrategy} from "./AuthStrategy";
import {HttpClient} from "@angular/common/http";

@Injectable({providedIn: 'root'})
export class AuthenticationService {
  private http = inject(HttpClient);
  private authMethod: AuthMethod = AuthMethod.LOCAL;
  public currentUser: BehaviorSubject<any>;

  constructor(
    private keycloakService: KeycloakService,
    private passportService: PassportService
  ) {
    this.currentUser = new BehaviorSubject<any>(null);
  }

  public checkAuthentication(): Observable<any> {
    return this.http.get<any>(`/rest/auth/check`).pipe(
      tap(user => {
        if (user) {
          this.authMethod = user.authMethod;
          this.currentUser.next(user);
        }
      }),
      catchError(() => {
        this.currentUser.next(null);
        return of(null);
      })
    );
  }

  private get strategy(): AuthStrategy {
    return this.authMethod === AuthMethod.KEYCLOAK ? this.keycloakService : this.passportService;
  }

  isAuthenticated(): Observable<boolean> {
    return this.currentUser.pipe(map(user => !!user));
  }

  getRoles(): string[] {
    const user = this.currentUser.getValue();
    return user ? user.roles || [] : [];
  }

  hasRole(role: string): boolean {
    return this.getRoles().includes(role);
  }

  getUsername(): string {
    const user = this.currentUser.getValue();
    return user ? user.username : '';
  }

  login(username: string, password: string, authMethod = AuthMethod.LOCAL) {
    this.authMethod = authMethod;
    return this.strategy.login(username, password).pipe(
      tap(user => {
        if (user) {
          this.currentUser.next(user);
        }
      })
    );
  }

  logout(fullKeycloakLogout: boolean = true): Observable<any> {
    if (this.authMethod === AuthMethod.KEYCLOAK && !fullKeycloakLogout) {
      this.currentUser.next(null);
      return of(null);
    }
    return this.strategy.logout().pipe(
      tap(() => {
        this.currentUser.next(null);
      })
    );
  }

}
