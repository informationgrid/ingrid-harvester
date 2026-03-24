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
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { UntilDestroy } from "@ngneat/until-destroy";
import { Datasource } from "@shared/datasource";
import { ConfirmDialogComponent } from "../../shared/confirm-dialog/confirm-dialog.component";
import { DialogEditComponent } from "../dialog-edit/dialog-edit.component";
import { DialogHistoryComponent } from "../dialog-history/dialog-history.component";
import { DialogLogComponent } from "../dialog-log/dialog-log.component";
import { DialogSchedulerComponent } from "../dialog-scheduler/dialog-scheduler.component";
import { DatasourceService } from "../services/datasource.service";
import { TranslocoService } from "@ngneat/transloco";
import { AuthenticationService } from "../../security/authentication.service";

@UntilDestroy()
@Component({
  selector: "harvester-datasource-overview",
  templateUrl: "./datasource-overview.component.html",
  styleUrls: ["./datasource-overview.component.scss"],
  standalone: false,
})
export class DatasourceOverviewComponent {
  importLogs = computed(() => this.datasourceService.importLogs());
  groupedDatasources: Signal<Record<string, Datasource[]>> = computed(() => {
    if (!this.datasourceService.datasources()) return {};
    return Object.values(this.datasourceService.datasources()).reduce(
      (acc, datasource) => {
        if (!acc[datasource.type]) {
          acc[datasource.type] = [];
        }
        acc[datasource.type].push(datasource);
        return acc;
      },
      {},
    );
  });

  isLoaded = computed(() => {
    return this.datasourceService.datasources() !== undefined;
  });
  hasDatasources = computed(() => {
    if (!this.isLoaded()) return false;
    return Object.keys(this.datasourceService.datasources()).length > 0;
  });

  isAdmin = computed(() => this.authService.hasRole("admin"));
  isEditor = computed(() => this.authService.hasRole("editor"));
  canEdit = computed(() => this.isAdmin() || this.isEditor());

  constructor(
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private datasourceService: DatasourceService,
    private transloco: TranslocoService,
    private authService: AuthenticationService,
  ) {}

  onImport(id: number, isIncremental: boolean = false) {
    this.datasourceService.import(id, isIncremental).subscribe();
    this.snackBar.open(
      this.transloco.translate("datasources.importStarted"),
      null,
      { duration: 3 * 1000 },
    );
  }

  onImportAll() {
    this.datasourceService.importAll().subscribe();
    this.snackBar.open(
      this.transloco.translate("datasources.allImportStarted"),
      null,
      { duration: 3 * 1000 },
    );
  }

  onAdd() {
    this.dialog
      .open(DialogEditComponent, {
        data: {
          icon: "Add",
          title: this.transloco.translate("datasources.addDatasource"),
          actionBtnText: this.transloco.translate("common.add"),
          datasource: {
            id: -1,
            rules: {},
          },
        },
        width: "900px",
        disableClose: true,
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;
        this.datasourceService.addOrUpdate(result);
      });
  }

  onView(datasource: Datasource) {
    this.dialog.open(DialogEditComponent, {
      data: {
        icon: "visibility_fill",
        title: this.transloco.translate("datasources.viewDatasource"),
        datasource,
        readonly: true,
      },
      width: "900px",
    });
  }

  onEdit(datasource: Datasource) {
    this.dialog
      .open(DialogEditComponent, {
        data: {
          title: this.transloco.translate("datasources.editDatasource"),
          actionBtnText: this.transloco.translate("common.update"),
          datasource,
        },
        width: "950px",
        disableClose: true,
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((result: Datasource) => {
        if (!result) return;
        this.datasourceService.edit(result);
      });
  }

  onDuplicate(datasource: Datasource) {
    this.dialog
      .open(DialogEditComponent, {
        data: {
          icon: "Copy",
          title: this.transloco.translate("datasources.addDatasource"),
          actionBtnText: this.transloco.translate("common.add"),
          datasource: {
            ...datasource,
            id: -1,
            index: "",
            description: datasource.description + " (Duplikat)",
          },
        },
        width: "950px",
        disableClose: true,
      })
      .afterClosed()
      .subscribe((result: Datasource) => {
        if (!result) return;
        this.datasourceService.addOrUpdate(result);
      });
  }

  onDelete(datasource: Datasource) {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: this.transloco.translate("datasources.deleteConfirmation"),
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;
        this.datasourceService.deleteById(datasource.id);
      });
  }

  onSchedule(datasource: Datasource) {
    this.dialog
      .open(DialogSchedulerComponent, {
        width: "500px",
        data: { harvesterType: datasource.type, cron: datasource.cron },
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;
        this.datasourceService.scheduleByCron(datasource, result.value);
      });
  }

  onShowHistory(harvester: Datasource) {
    this.datasourceService.getHistory(harvester.id).subscribe({
      next: (data) => {
        if (!data || data.history.length === 0) {
          return alert(this.transloco.translate("datasources.noHistory"));
        }
        this.dialog.open(DialogHistoryComponent, {
          data: data,
          width: "950px",
        });
      },
      error: (err) => alert(err.message),
    });
  }

  onShowLogs(id: number) {
    if (this.importLogs()[id]?.summary) {
      this.dialog.open(DialogLogComponent, {
        width: "900px",
        height: "600px",
        data: {
          content: this.importLogs()[id],
        },
      });
    } else {
      this.snackBar.open(this.transloco.translate("datasources.noLogs"), null, {
        duration: 2 * 1000,
      });
    }
  }
}
