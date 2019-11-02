import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Index} from '@shared/index.model';

@Injectable({
  providedIn: 'root'
})
export class IndicesService {

  constructor(private http: HttpClient) { }

  get() {
    return this.http.get<Index[]>('rest/api/indices');
  }

  deleteIndex(name: string) {
    return this.http.delete('rest/api/indices/' + name);
  }
}
