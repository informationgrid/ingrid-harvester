import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Observable} from "rxjs";
import {GeneralSettings} from "@shared/general-config.settings";

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  constructor(private http: HttpClient) {
  }

  fetch(): Observable<GeneralSettings> {
    return this.http.get<any>('rest/api/config/general');
  }

  save(data: GeneralSettings): Observable<void> {
    return this.http.post<void>('rest/api/config/general', data);
  }

  /**
   * Download a file.
   * @param data - Array Buffer data
   */
  static downLoadFile(data: any) {
    let blob = new Blob([data], {type: 'application/octet-stream'});
    let url = window.URL.createObjectURL(blob);

    // create a temporary link to download data with a given file name
    let a = document.createElement("a");
    document.body.appendChild(a);
    a.style.display = "none";
    a.href = url;
    a.download = 'config.json';

    // do not actually download file during test
    // @ts-ignore
    if (window.Cypress) {
      return;
    }

    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  }
}
