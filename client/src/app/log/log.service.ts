import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LogService {

  constructor(private http: HttpClient) {
  }

  getLog(): Observable<string> {
    return this.http.get('rest/api/log', {responseType: 'text'});
  }

}
