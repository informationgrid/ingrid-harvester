import {Injectable} from "@angular/core";
import {Index} from "@shared/index.model";
import {HttpClient} from "@angular/common/http";
import {Observable} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class ContextHelpService {

  constructor(private http: HttpClient) {
  }

  get(markdownFile: string): Observable<string> {
    const locale = 'de',
        profile = "ingrid";
    return this.http.get(`/rest/api/help/${locale}/${profile}/${markdownFile}`, {
      responseType: 'text'
    });
  }
}
