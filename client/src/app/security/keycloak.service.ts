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

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import Keycloak from 'keycloak-js';

@Injectable({
  providedIn: 'root'
})
export class KeycloakService {
  private keycloak: Keycloak | null = null;
  private authenticated = new BehaviorSubject<boolean>(false);
  private keycloakConfig = {
    url: 'http://localhost:8080', // Replace with your Keycloak server URL
    realm: 'InGrid', // Replace with your realm
    clientId: 'harvester' // Replace with your client ID
  };

  constructor() {}

  init(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.keycloak = new Keycloak(this.keycloakConfig);

      this.keycloak.init({
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: window.location.origin + '/assets/silent-check-sso.html',
        checkLoginIframe: false
      })
      .then(authenticated => {
        debugger
        this.authenticated.next(authenticated);
        resolve(authenticated);
      })
      .catch(error => {
        console.error('Failed to initialize Keycloak', error);
        reject(error);
      });
    });
  }

  login(): Promise<void> {
    return this.keycloak?.login() || Promise.reject('Keycloak not initialized');
  }

  logout(): Promise<void> {
    return this.keycloak?.logout() || Promise.reject('Keycloak not initialized');
  }

  isAuthenticated(): Observable<boolean> {
    return this.authenticated.asObservable();
  }

  getToken(): Observable<string> {
    return from(this.updateToken(30)).pipe(
      map(() => this.keycloak?.token || ''),
      catchError(error => {
        console.error('Failed to get token', error);
        return of('');
      })
    );
  }

  getUsername(): string {
    return this.keycloak?.tokenParsed?.preferred_username || '';
  }

  private updateToken(minValidity: number): Promise<boolean> {
    return this.keycloak?.updateToken(minValidity) || Promise.reject('Keycloak not initialized');
  }
}
