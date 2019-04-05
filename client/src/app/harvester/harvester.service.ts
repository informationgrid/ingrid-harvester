import { Injectable } from '@angular/core';
import {Observable, of} from "rxjs";
import {Harvester} from "./model/harvester";
import {HarvesterType} from "./model/HarvesterType";

@Injectable({
  providedIn: 'root'
})
export class HarvesterService {

  constructor() { }

  getHarvester(): Observable<Harvester[]> {
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
  }
}
