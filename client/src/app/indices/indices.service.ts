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
import {HttpClient, HttpResponse} from '@angular/common/http';
import {Index} from '@shared/index.model';
import {Observable, Subject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class IndicesService {

  searchResponse$ = new Subject<any>();

  constructor(private http: HttpClient) {
  }

  get() {
    return this.http.get<Index[]>('rest/api/indices');
  }

  deleteIndex(name: string) {
    return this.http.delete('rest/api/indices/' + name);
  }

  exportIndex(name: string) {
    return this.http.get('rest/api/indices/' + name);
  }
  search(indexName: string) {
    this.http.get('rest/api/search/' + indexName)
      .subscribe(response => this.searchResponse$.next(response));
  }

  importIndex(file: File):Observable<Blob> {
    return this.http.post<Blob>('rest/api/indices', file);
  }
}
