/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2024 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or - as soon they will be
 * approved by the European Commission - subsequent versions of the
 * EUPL (the "Licence");
 *
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the Licence is distributed on an "AS IS" basis,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and
 * limitations under the Licence.
 * ==================================================
 */

import { Component, computed, OnInit, Signal, signal } from "@angular/core";
import { CatalogsService } from "../services/catalogs.service";
import { MatDialog } from "@angular/material/dialog";
import { FormDialogComponent } from "../../shared/form-dialog/form-dialog.component";
import { TranslocoPipe } from "@ngneat/transloco";
import SharedFields from "../form-fields/shared.fields";
import CswFields from "../form-fields/csw.fields";
import ElasticsearchFields from "../form-fields/elasticsearch.fields";
import PiveauFields from "../form-fields/piveau.fields";
import { ConfirmDialogComponent } from "../../shared/confirm-dialog/confirm-dialog.component";

@Component({
  selector: "harvester-catalog-overview",
  templateUrl: "./catalog-overview.component.html",
  styleUrls: ["./catalog-overview.component.scss"],
  providers: [TranslocoPipe],
  standalone: false,
})
export class CatalogOverviewComponent implements OnInit {
  catalogs = signal<Record<number, any>>(undefined);
  groupedCatalogs: Signal<any> = computed(() => {
    if (!this.catalogs()) return {};
    return Object.values(this.catalogs()).reduce((acc, catalog) => {
      if (!acc[catalog.type]) {
        acc[catalog.type] = [];
      }
      acc[catalog.type].push(catalog);
      return acc;
    }, {});
  });

  // Fields for adding and editing a catalog.
  catalogFields = [
    ...SharedFields.general(),
    ...CswFields.fields(),
    ...ElasticsearchFields.fields(),
    ...PiveauFields.fields(),
  ];

  constructor(
    private catalogsService: CatalogsService,
    private dialog: MatDialog,
    private transloco: TranslocoPipe,
  ) {}

  ngOnInit(): void {
    this.fetchCatalogs();
  }

  private fetchCatalogs() {
    this.catalogsService.getCatalogs().subscribe((catalogs) => {
      const _catalogs: Record<number, any> = {};
      catalogs.forEach((catalog) => (_catalogs[catalog.id] = catalog));
      console.log(_catalogs);
      this.catalogs.set(_catalogs);
    });
  }

  onEdit(
    initialValues?: any,
    options?: {
      title?: string;
      submitText?: string;
      icon?: string;
    },
  ) {
    this.dialog
      .open(FormDialogComponent, {
        data: {
          title:
            options?.title ??
            this.transloco.transform(
              initialValues ? "catalogs.editCatalog" : "catalogs.addCatalog",
            ),
          submitText:
            options?.submitText ??
            this.transloco.transform(
              initialValues ? "common.update" : "common.create",
            ),
          icon: options?.icon ?? (initialValues ? "Edit" : "Add"),
          fields: this.catalogFields,
          initialValues: { ...initialValues },
        },
        width: "700px",
        disableClose: true,
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;

        // Distinguish between new or existing catalog.
        if (result.id) {
          this.catalogsService.updateCatalog(result).subscribe({
            next: (res) => {
              this.updateInternalCatalog(res);
            },
            error: (err) => {
              console.error("Error updating catalog:", err);
            },
          });
        } else {
          this.catalogsService.createCatalog(result).subscribe({
            next: (res) => {
              this.updateInternalCatalog(res);
            },
            error: (err) => {
              console.error("Error updating catalog:", err);
            },
          });
        }
      });
  }

  onDuplicate(initialValues: any) {
    const _initialValues = {
      ...initialValues,
      id: null,
      name: initialValues.name + " (Duplikat)",
    };
    this.onEdit(_initialValues, {
      title: this.transloco.transform("catalogs.duplicateCatalog"),
      submitText: this.transloco.transform("common.duplicate"),
      icon: "Copy",
    });
  }

  onDelete(catalog: any) {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: this.transloco.transform("catalogs.deleteConfirmation"),
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;

        this.catalogsService.deleteCatalog(catalog.id).subscribe({
          next: (res) => {
            this.catalogs.update((current) => {
              const updated = { ...current };
              delete updated[catalog.id];
              return updated;
            });
          },
          error: (err) => {
            console.error("Error deleting catalog:", err);
          },
        });
      });
  }

  // Update the catalog in the catalogs signal.
  private updateInternalCatalog(catalog) {
    this.catalogs.update((current) => ({
      ...current,
      [catalog.id]: catalog,
    }));
  }
}
