import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class CatalogsService {
  constructor(private http: HttpClient) {}

  getCatalogs(): Observable<any[]> {
    return this.http.get<any[]>("rest/api/catalogs");
  }

  // The given catalog should not contain the id.
  createCatalog(catalog: any): Observable<any> {
    return this.http.post("rest/api/catalogs", catalog);
  }

  // The given catalog must contain the id.
  updateCatalog(catalog: any): Observable<any> {
    return this.http.post("rest/api/catalogs", catalog);
  }

  deleteCatalog(id: string): Observable<any> {
    return this.http.delete("rest/api/catalogs/" + id);
  }
}
