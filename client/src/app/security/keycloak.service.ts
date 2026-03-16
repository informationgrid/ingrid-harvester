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
import {BehaviorSubject, Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class KeycloakService {
  private authenticated = new BehaviorSubject<boolean>(false);
  private username: string = '';

  constructor(private http: HttpClient) {
  }

  init(): Promise<boolean> {
    return this.http.get<any>('rest/auth/keycloak/check')
      .toPromise()
      .then(user => {
        this.authenticated.next(true);
        this.username = user.username || '';
        return true;
      })
      .catch(() => {
        this.authenticated.next(false);
        return false;
      });
  }

  login(): void {
    window.location.href = 'rest/auth/keycloak/login';
  }

  logout(): void {
    window.location.href = 'rest/auth/keycloak/logout';
  }

  isAuthenticated(): Observable<boolean> {
    return this.authenticated.asObservable();
  }

  getUsername(): string {
    return this.username;
  }
}
