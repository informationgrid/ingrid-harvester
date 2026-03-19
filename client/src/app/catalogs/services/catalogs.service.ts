import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { Catalog } from "@shared/catalog";

@Injectable({
  providedIn: "root",
})
export class CatalogsService {
  constructor(private http: HttpClient) {}

  getCatalogs(): Observable<Catalog[]> {
    return this.http.get<Catalog[]>("rest/api/catalogs");
  }

  // The given catalog should not contain the id.
  createCatalog(catalog: Catalog): Observable<any> {
    return this.http.post("rest/api/catalogs", catalog);
  }

  // The given catalog must contain the id.
  updateCatalog(catalog: Catalog): Observable<any> {
    return this.http.post("rest/api/catalogs", catalog);
  }

  deleteCatalog(id: number): Observable<any> {
    return this.http.delete("rest/api/catalogs/" + id);
  }
}
