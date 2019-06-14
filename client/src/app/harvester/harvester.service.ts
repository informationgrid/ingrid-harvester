import {Injectable} from '@angular/core';
import {Observable} from "rxjs";
import {Harvester} from "./model/harvester";
import {HttpClient} from "@angular/common/http";

@Injectable({
  providedIn: 'root'
})
export class HarvesterService {

  constructor(private http: HttpClient) { }

  getHarvester(): Observable<Harvester[]> {

    return this.http.get<Harvester[]>('rest/api/harvester');

  }

  runImport(id: string): Observable<void> {

    return this.http.post<void>('rest/api/import/' + id, null);

  }
}
