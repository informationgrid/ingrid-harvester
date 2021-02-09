import {Injectable} from '@angular/core';
import {HttpClient, HttpResponse} from '@angular/common/http';
import {Index} from '@shared/index.model';
import {Observable, Subject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class IndicesService {

  searchResponse$ = new Subject<any>();

  constructor(private http: HttpClient) {
  }

  get() {
    return this.http.get<Index[]>('rest/api/indices');
  }

  deleteIndex(name: string) {
    return this.http.delete('rest/api/indices/' + name);
  }

  exportIndex(name: string) {
    return this.http.get('rest/api/indices/' + name);
  }
  search(indexName: string) {
    this.http.get('rest/api/search/' + indexName)
      .subscribe(response => this.searchResponse$.next(response));
  }

  importIndex(file: File):Observable<Blob> {
    return this.http.post<Blob>('rest/api/indices', file);
  }
}
