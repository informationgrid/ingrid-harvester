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
}
