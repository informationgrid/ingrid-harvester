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

import { Component, computed, Signal } from "@angular/core";
import { CatalogService } from "../services/catalog.service";
import { MatDialog } from "@angular/material/dialog";
import { FormDialogComponent } from "../../shared/form-dialog/form-dialog.component";
import { TranslocoPipe, TranslocoService } from "@ngneat/transloco";
import SharedFields from "../form-fields/shared.fields";
import CswType from "../form-fields/csw.type";
import ElasticsearchType from "../form-fields/elasticsearch.type";
import PiveauType from "../form-fields/piveau.type";
import { ConfirmDialogComponent } from "../../shared/confirm-dialog/confirm-dialog.component";
import { Catalog } from "@shared/catalog";

@Component({
  selector: "harvester-catalog-overview",
  templateUrl: "./catalog-overview.component.html",
  styleUrls: ["./catalog-overview.component.scss"],
  providers: [TranslocoPipe],
  standalone: false,
})
export class CatalogOverviewComponent {
  groupedCatalogs: Signal<Record<string, Catalog[]>> = computed(() => {
    if (!this.catalogService.catalogs()) return {};
    return Object.values(this.catalogService.catalogs()).reduce(
      (acc, catalog) => {
        if (!acc[catalog.type]) {
          acc[catalog.type] = [];
        }
        acc[catalog.type].push(catalog);
        return acc;
      },
      {},
    );
  });

  // Fields for adding and editing a catalog.
  catalogFields = [
    ...SharedFields.general(),
    ...CswType.fields(),
    ...ElasticsearchType.fields(),
    ...PiveauType.fields(),
  ];

  constructor(
    private dialog: MatDialog,
    private transloco: TranslocoService,
    private catalogService: CatalogService,
  ) {}

  onEdit(
    initialValues?: Catalog,
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
            this.transloco.translate(
              initialValues ? "catalogs.editCatalog" : "catalogs.addCatalog",
            ),
          submitText:
            options?.submitText ??
            this.transloco.translate(
              initialValues ? "common.update" : "common.create",
            ),
          icon: options?.icon ?? (initialValues ? "Edit" : "Add"),
          fields: this.catalogFields,
          initialValues: initialValues,
        },
        width: "700px",
        disableClose: true,
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;
        if (result.id) {
          this.catalogService.updateCatalog(result);
        } else {
          this.catalogService.createCatalog(result);
        }
      });
  }

  onDuplicate(initialValues: Catalog) {
    const _initialValues = {
      ...initialValues,
      id: null,
      name: initialValues.name + " (Duplikat)",
    };
    this.onEdit(_initialValues, {
      title: this.transloco.translate("catalogs.addCatalog"),
      submitText: this.transloco.translate("common.duplicate"),
      icon: "Copy",
    });
  }

  onDelete(catalog: Catalog) {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: this.transloco.translate("catalogs.deleteConfirmation"),
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;
        this.catalogService.deleteCatalog(catalog.id);
      });
  }
}
