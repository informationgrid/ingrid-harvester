import { Injectable, signal } from "@angular/core";
import { Catalog } from "@shared/catalog";
import { CatalogApi } from "./catalog.api";

@Injectable({
  providedIn: "root",
})
export class CatalogService {
  private _catalogs = signal<Record<number, Catalog>>(undefined);
  catalogs = this._catalogs.asReadonly();

  constructor(private api: CatalogApi) {
    this.fetchCatalogs();
  }

  fetchCatalogs() {
    this.api.getCatalogs().subscribe((catalogs) => {
      const tmpCatalogs: Record<number, any> = {};
      catalogs.forEach((catalog) => (tmpCatalogs[catalog.id] = catalog));
      this._catalogs.set(tmpCatalogs);
      console.log(this.catalogs());
    });
  }

  createCatalog(catalog: Catalog) {
    this.api.createCatalog(catalog).subscribe({
      next: (res) => this.updateCatalogs(res),
      error: (err) => console.error("Error creating catalog:", err),
    });
  }

  updateCatalog(catalog: Catalog) {
    this.api.updateCatalog(catalog).subscribe({
      next: (res) => this.updateCatalogs(res),
      error: (err) => console.error("Error updating catalog:", err),
    });
  }

  deleteCatalog(id: number) {
    this.api.deleteCatalog(id).subscribe({
      next: () => {
        this._catalogs.update((current) => {
          const updated = { ...current };
          delete updated[id];
          return updated;
        });
      },
      error: (err) => console.error("Error deleting catalog:", err),
    });
  }

  private updateCatalogs(catalog: Catalog) {
    this._catalogs.update((current) => ({
      ...current,
      [catalog.id]: catalog,
    }));
  }
}
