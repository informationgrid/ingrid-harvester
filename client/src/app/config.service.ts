/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2022 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, Observable} from 'rxjs';
import {tap} from 'rxjs/operators';

export class Configuration {
  constructor(public contextPath: string, public url?: string, public version?: string) {
  }
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  config: Configuration;
  config$ = new BehaviorSubject({});

  constructor(private http: HttpClient) {
  }

  load(url: string): Observable<Configuration> {
    console.log('=== ConfigService ===');

    return this.http.get<Configuration>(url)
      .pipe(
        tap((json => {
          this.config = json;
          this.config$.next(json);
        }))
      );

  }
}
