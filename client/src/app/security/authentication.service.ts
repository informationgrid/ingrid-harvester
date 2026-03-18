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
import {BehaviorSubject, Observable, of} from 'rxjs';
import {tap} from 'rxjs/operators';
import {KeycloakService} from './keycloak.service';
import {PassportService} from './passport.service';

export enum AuthMethod {
  LOCAL = 'local',
  KEYCLOAK = 'keycloak'
}

export interface AuthStrategy {
  isAuthenticated(): Observable<boolean>;
  getRoles(): string[];
  hasRole(role: string): boolean;
  login(username?: string, password?: string): Observable<any>;
  logout(): Observable<any>;
}

@Injectable({providedIn: 'root'})
export class AuthenticationService {
  private authMethod: AuthMethod = AuthMethod.LOCAL;
  public currentUser: BehaviorSubject<any>;

  constructor(
    private keycloakService: KeycloakService,
    private passportService: PassportService
  ) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    this.currentUser = new BehaviorSubject<any>(user);

    if (user && user.authMethod) {
      this.authMethod = user.authMethod;
    }

    // Check if user is already authenticated with Keycloak
    this.keycloakService.isAuthenticated().subscribe(authenticated => {
      if (authenticated) {
        this.authMethod = AuthMethod.KEYCLOAK;
        const keycloakUser = {
          username: this.keycloakService.getUsername(),
          authMethod: AuthMethod.KEYCLOAK
        };
        localStorage.setItem('currentUser', JSON.stringify(keycloakUser));
        this.currentUser.next(keycloakUser);
      }
    });
  }

  private get strategy(): AuthStrategy {
    return this.authMethod === AuthMethod.KEYCLOAK ? this.keycloakService : this.passportService;
  }

  isAuthenticated(): Observable<boolean> {
    return this.strategy.isAuthenticated();
  }

  hasRole(role: string): boolean {
    return this.strategy.hasRole(role);
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
      localStorage.removeItem('currentUser');
      this.currentUser.next(null);
      return of(null);
    }
    return this.strategy.logout().pipe(
      tap(() => {
        localStorage.removeItem('currentUser');
        this.currentUser.next(null);
      })
    );
  }

  initKeycloak(): Promise<boolean> {
    return this.keycloakService.init();
  }
}
