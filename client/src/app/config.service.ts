import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, Subject} from 'rxjs';
import {tap} from 'rxjs/operators';

export class Configuration {
  constructor(public contextPath: string, public url?: string, public version?: string) {
  }
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  config: Configuration;
  config$ = new Subject();

  constructor(private http: HttpClient) {
  }

  load(url: string): Observable<Configuration> {
    console.log('=== ConfigService ===');

    return this.http.get<Configuration>(url)
      .pipe(
        tap((json => {
          this.config = json;
          this.config$.next(json);
        }))
      );

  }
}
