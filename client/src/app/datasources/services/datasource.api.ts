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

import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { Datasource } from "@shared/datasource";
import { HttpClient } from "@angular/common/http";
import { ImportLogMessage } from "../../../../../server/app/model/import.result";
import { CronData } from "../../../../../server/app/importer/importer.settings";

@Injectable({
  providedIn: "root",
})
export class DatasourceApi {
  constructor(private http: HttpClient) {}

  getImporterTypes(): Observable<any[]> {
    return this.http.get<any[]>("rest/api/config/importer_types");
  }

  getDatasources(): Observable<Datasource[]> {
    return this.http.get<Datasource[]>("rest/api/harvester");
  }

  import(id: number, isIncremental: boolean): Observable<void> {
    return this.http.post<void>(
      `rest/api/import/${id}?isIncremental=${isIncremental}`,
      null,
    );
  }

  importAll(): Observable<void> {
    return this.http.post<void>("rest/api/importAll", null);
  }

  getLastLogs(): Observable<ImportLogMessage[]> {
    return this.http.get<ImportLogMessage[]>("rest/api/lastLogs");
  }

  update(datasource: Datasource): Observable<void> {
    return this.http.post<void>(
      "rest/api/harvester/" + (datasource.id || -1),
      datasource,
    );
  }

  // Returns two dates in an array [full, incr].
  // It can be [null, null], if nothing is scheduled.
  schedule(
    id: number,
    cron: { full: CronData; incr: CronData },
  ): Observable<Date[]> {
    return this.http.post<Date[]>("rest/api/schedule/" + id, { cron: cron });
  }

  delete(id: number) {
    return this.http.delete("rest/api/harvester/" + id);
  }

  uploadDatasourceConfig(file: File): Observable<void> {
    return this.http.post<void>("rest/api/harvester/filecontent", file);
  }

  getHistory(id: number): Observable<any> {
    return this.http.get<any>("rest/api/harvester/history/" + id);
  }

  getJobs(id: number): Observable<any> {
    return this.http.get<any>("rest/api/harvester/jobs/" + id);
  }

  getHarvesterLog(harvesterId: number, jobId: string): Observable<string> {
    console.log("harvester-id", harvesterId, "job:", jobId);
    return this.http.get(`rest/api/log/${harvesterId}/${jobId}`, {
      responseType: "text",
    });
  }
}
