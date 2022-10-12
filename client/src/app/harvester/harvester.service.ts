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
import {Observable} from 'rxjs';
import {Harvester} from '@shared/harvester';
import {HttpClient} from '@angular/common/http';
import {ImportLogMessage} from '../../../../server/app/model/import.result';
import {CkanSettings} from '../../../../server/app/importer/ckan/ckan.settings';
import {CronData} from '../../../../server/app/importer.settings';

@Injectable({
  providedIn: 'root'
})
export class HarvesterService {

  constructor(private http: HttpClient) {
  }

  private static prepareHarvesterForBackend(harvester) {
    if (harvester.type === 'CKAN') {
      const ckanHarvester = harvester as CkanSettings;
      const license = ckanHarvester.defaultLicense;
      if (license && license.id.trim().length === 0
        && license.title.trim().length === 0
        && license.url.trim().length === 0) {
        ckanHarvester.defaultLicense = null;
      }
    }
  }

  getHarvester(): Observable<Harvester[]> {

    return this.http.get<Harvester[]>('rest/api/harvester');

  }

  runImport(id: number, isIncremental?: boolean): Observable<void> {
    return id === null
      ? this.http.post<void>('rest/api/importAll', null)
      : this.http.post<void>(`rest/api/import/${id}?isIncremental=${isIncremental}`, null);
  }

  getLastLogs(): Observable<ImportLogMessage[]> {

    return this.http.get<ImportLogMessage[]>('rest/api/lastLogs');

  }

  updateHarvester(harvester: Harvester): Observable<void> {
    HarvesterService.prepareHarvesterForBackend(harvester);
    return this.http.post<void>('rest/api/harvester/' + (harvester.id || -1), harvester);
  }

  schedule(id: number, cron: { full: CronData, incr: CronData }): Observable<Date[]> {
    return this.http.post<Date[]>('rest/api/schedule/' + id, {cron: cron});
  }

  delete(id: number) {
    return this.http.delete('rest/api/harvester/' + id);
  }

  uploadHarvesterConfig(file: File): Observable<void> {
    return this.http.post<void>('rest/api/harvester/filecontent', file);
  }

  getHarvesterHistory(id:number): Observable<any> {
    return this.http.get<any>('rest/api/harvester/history/'+id);
  }
}
