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

import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { AuthMethod, AuthStrategy } from "./AuthStrategy";

@Injectable({ providedIn: "root" })
export class PassportService implements AuthStrategy {
  private http = inject(HttpClient);

  login(username: string, password: string): Observable<any> {
    return this.http
      .post<any>(`rest/passport/login`, { username, password })
      .pipe(
        map((user) => {
          user.authMethod = AuthMethod.LOCAL;
          return user;
        }),
      );
  }

  logout(): Observable<any> {
    return this.http.get("/rest/passport/logout", { responseType: "text" });
  }
}
