import {Injectable} from '@angular/core';
import {Observable} from "rxjs";
import {Harvester} from "./model/harvester";
import {HttpClient} from "@angular/common/http";
import {ImportLogMessage} from "../../../../server/app/model/import.result";
import {CkanSettings} from "../../../../server/app/importer/ckan/ckan.settings";

@Injectable({
  providedIn: 'root'
})
export class HarvesterService {

  constructor(private http: HttpClient) {
  }

  getHarvester(): Observable<Harvester[]> {

    return this.http.get<Harvester[]>('rest/api/harvester');

  }

  runImport(id: number): Observable<void> {
    return id === null
      ? this.http.post<void>('rest/api/importAll', null)
      : this.http.post<void>('rest/api/import/' + id, null);

  }

  getLastLogs(): Observable<ImportLogMessage[]> {

    return this.http.get<ImportLogMessage[]>('rest/api/lastLogs');

  }

  updateHarvester(harvester: Harvester): Observable<void> {
    HarvesterService.prepareHarvesterForBackend(harvester);
    return this.http.post<void>('rest/api/harvester/' + (harvester.id || -1), harvester);
  }

  private static prepareHarvesterForBackend(harvester) {
    if (harvester.type === 'CKAN') {
      let ckanHarvester = harvester as CkanSettings;
      const license = ckanHarvester.defaultLicense;
      if (license && license.id.trim().length === 0
        && license.title.trim().length === 0
        && license.url.trim().length === 0) {
        ckanHarvester.defaultLicense = null;
      }
    }
  }

  schedule(id: number, cronExpression: string): Observable<void> {
    return this.http.post<void>('rest/api/schedule/' + id, {cron: cronExpression});
  }
}
