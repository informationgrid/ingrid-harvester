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
    const modified = this.modifyCatalogForBackend(catalog);
    this.api.createCatalog(modified).subscribe({
      next: (res) => this.updateCatalogs(res),
      error: (err) => console.error("Error creating catalog:", err),
    });
  }

  updateCatalog(catalog: Catalog) {
    const modified = this.modifyCatalogForBackend(catalog);
    this.api.updateCatalog(modified).subscribe({
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

  // It returns a new catalog object.
  private modifyCatalogForBackend(catalog: Catalog) {
    const modified = { ...catalog };

    // Only submit sensitive data if given.
    if (
      catalog.settings?.password != undefined &&
      catalog.settings?.password?.trim() == ""
    ) {
      delete modified.settings.password;
    }

    return modified;
  }

  private updateCatalogs(catalog: Catalog) {
    this._catalogs.update((current) => ({
      ...current,
      [catalog.id]: catalog,
    }));
  }
}
