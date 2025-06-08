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
import {BehaviorSubject, from, Observable, of} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {KeycloakOptions, KeycloakService as KeycloakAngularService} from 'keycloak-angular';

@Injectable({
  providedIn: 'root'
})
export class KeycloakService {
  private authenticated = new BehaviorSubject<boolean>(false);
  private keycloakConfig = {
    url: 'http://localhost:8080', // Replace with your Keycloak server URL
    realm: 'InGrid', // Replace with your realm
    clientId: 'harvester' // Replace with your client ID
  };

  constructor(private keycloakAngular: KeycloakAngularService) {
  }

  init(): Promise<boolean> {
    const options: KeycloakOptions = {
      config: this.keycloakConfig,
      initOptions: {
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: window.location.origin + '/assets/silent-check-sso.html',
        // checkLoginIframe: false
      },
      enableBearerInterceptor: false // We'll handle this manually in the UnauthorizedInterceptor
    };

    return this.keycloakAngular.init(options)
      .then(authenticated => {
        this.authenticated.next(authenticated);
        return authenticated;
      })
      .catch(error => {
        console.error('Failed to initialize Keycloak', error);
        return false;
      });
  }

  login(): Promise<void> {
    return this.keycloakAngular.login();
  }

  logout(): Promise<void> {
    return this.keycloakAngular.logout();
  }

  isAuthenticated(): Observable<boolean> {
    return this.authenticated.asObservable();
  }

  getToken(): Observable<string> {
    return from(this.keycloakAngular.getToken()).pipe(
      catchError(error => {
        console.error('Failed to get token', error);
        return of('');
      })
    );
  }

  getUsername(): string {
    try {
      const userProfile = this.keycloakAngular.getKeycloakInstance().tokenParsed;
      return userProfile?.preferred_username || '';
    } catch (error) {
      console.error('Error getting username', error);
      return '';
    }
  }
}
