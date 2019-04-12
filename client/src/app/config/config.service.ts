import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Observable, of} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  constructor(private http: HttpClient) { }

  fetch(): Observable<any> {
    //this.http.get('')
    return of({
      elasticsearchUrl: 'localhost:9200',
      alias: 'mcloud'
    });
  }

  save(data: any) {
    
  }
}
