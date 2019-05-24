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
    return this.http.get<Harvester[]>('api/harvester');
/*
    return of(<Harvester[]>[
      {
        id: '1',
        type: HarvesterType.EXCEL,
        name: 'Excel',
        description: 'Harvester zur Indexierung einer Excel-Datei',
        summary: {
          numberOfDocs: 313,
          numberOfErrors: 0,
          numberOfWarnings: 0,
          lastExecution: new Date(),
          nextExecution: new Date()
        }
      },
      {
        id: "2",
        type: HarvesterType.CKAN,
        name: 'CKAN DB',
        description: 'Daten von der Deutschen Bahn',
        summary: null
      }
    ])
*/
  }
}
