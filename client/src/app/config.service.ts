import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {tap} from 'rxjs/operators';

export class Configuration {
  constructor(public backendUrl: string) {
  }
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  config: Configuration;

  constructor(private http: HttpClient) {
  }

  load(url: string): Observable<Configuration> {
    console.log('=== ConfigService ===');

    return this.http.get<Configuration>(url)
      .pipe(
        tap((json => this.config = json))
      );

  }
}
