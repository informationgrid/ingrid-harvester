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

import { Component, computed, OnDestroy, OnInit, signal } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { UntilDestroy, untilDestroyed } from "@ngneat/until-destroy";
import { Harvester } from "@shared/harvester";
import { ImportLogMessage } from "../../../../server/app/model/import.result";
import { ConfirmDialogComponent } from "../shared/confirm-dialog/confirm-dialog.component";
import { DialogEditComponent } from "./dialog-edit/dialog-edit.component";
import { DialogHistoryComponent } from "./dialog-history/dialog-history.component";
import { DialogLogComponent } from "./dialog-log/dialog-log.component";
import { DialogSchedulerComponent } from "./dialog-scheduler/dialog-scheduler.component";
import { DatasourceService } from "./datasource.service";
import { SocketService } from "./socket.service";
import { TranslocoPipe } from "@ngneat/transloco";
import { getLatestDate } from "../utils/dateUtils";

@UntilDestroy()
@Component({
  selector: "harvester-datasource-overview",
  templateUrl: "./datasource-overview.component.html",
  styleUrls: ["./datasource-overview.component.scss"],
  providers: [TranslocoPipe],
  standalone: false,
})
export class DatasourceOverviewComponent implements OnInit, OnDestroy {
  datasources = signal<Record<number, Harvester>>(undefined);
  importLogs = signal<Record<number, ImportLogMessage>>(undefined);

  datasourcesLoaded = computed(() => this.datasources() !== undefined);
  hasDatasources = computed(() => {
    if (!this.datasourcesLoaded()) return false;
    return Object.keys(this.datasources()).length > 0;
  });

  constructor(
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    private datasourceService: DatasourceService,
    private socketService: SocketService,
    private translocoPipe: TranslocoPipe,
  ) {}

  ngOnInit() {
    this.fetchDatasources();
    this.fetchImportLogs();
    this.listenToImportLogChangesFromServer();
    this.listenToConnectionChangesFromServer();
  }

  ngOnDestroy() {}

  private fetchDatasources() {
    this.datasourceService.getDatasources().subscribe({
      next: (items) => {
        if (!items) return;
        const datasources: Record<number, Harvester> = {};
        for (const item of items) datasources[item.id] = item;
        this.datasources.set(datasources);
      },
      error: (error) => {
        console.error("Error fetching datasources", error);
      },
    });
  }

  private fetchImportLogs() {
    this.datasourceService.getLastLogs().subscribe({
      next: (logs) => {
        const importLogs: Record<number, ImportLogMessage> = {};
        for (const log of logs) importLogs[log.id] = log;
        this.importLogs.set(importLogs);
      },
      error: (error) => {
        console.error("Error fetching import logs", error);
      },
    });
  }

  private listenToImportLogChangesFromServer() {
    this.socketService.log$.pipe(untilDestroyed(this)).subscribe({
      next: (data) => {
        this.importLogs.update((current) => ({
          ...current,
          [data.id]: data,
        }));
      },
      error: (error) => {
        console.error("Error syncing import logs", error);
      },
    });
  }

  private listenToConnectionChangesFromServer() {
    this.socketService.connectionLost$
      .pipe(untilDestroyed(this))
      .subscribe((isLost) => {
        if (isLost) {
          this.snackBar.open(
            this.translocoPipe.transform("harvester.lostConnection"),
            null,
            { duration: 2 * 1000 },
          );
        } else {
          this.snackBar.open(
            this.translocoPipe.transform("harvester.recoverConnection"),
            null,
            { duration: 2 * 1000 },
          );
          this.fetchImportLogs();
          if (!this.datasourcesLoaded()) {
            this.fetchDatasources();
          }
        }
      });
  }

  onImport(id: number, isIncremental: boolean = false) {
    this.datasourceService.runImport(id, isIncremental).subscribe();
    this.snackBar.open(
      this.translocoPipe.transform("harvester.importStarted"),
      null,
      { duration: 3 * 1000 },
    );

    // Reset the import log.
    this.importLogs.update((current) => ({
      ...current,
      [id]: { complete: false },
    }));
  }

  onImportAll() {
    this.datasourceService.runImport(null).subscribe();
    this.snackBar.open(
      this.translocoPipe.transform("harvester.allImportStarted"),
      null,
      { duration: 3 * 1000 },
    );
  }

  onAdd() {
    this.dialog
      .open(DialogEditComponent, {
        data: {
          id: -1,
          rules: {},
        },
        width: "900px",
        disableClose: true,
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;
        this.datasourceService.update(result).subscribe({
          next: () => this.fetchDatasources(),
          error: (err) => alert(err.message),
        });
      });
  }

  onDelete(datasource: Harvester) {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: this.translocoPipe.transform("harvester.deleteConfirmation"),
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;
        this.datasourceService.delete(datasource.id).subscribe({
          next: () => this.fetchDatasources(),
          error: (err) => alert(err.message),
        });
      });
  }

  onEdit(harvester: Harvester) {
    this.dialog
      .open(DialogEditComponent, {
        data: JSON.parse(JSON.stringify(harvester)),
        width: "950px",
        disableClose: true,
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((result: Harvester) => {
        if (!result) return;

        // this is a really ugly hack, someone fix this in wfs-harvester.component.ts instead
        if ("contactMetadata" in result) {
          try {
            result.contactMetadata =
              (result.contactMetadata as unknown) != ""
                ? JSON.parse(result.contactMetadata as unknown as string)
                : null;
          } catch (e) {
            // swallow errors
          }
        }
        if ("maintainer" in result) {
          try {
            result.maintainer =
              (result.maintainer as unknown) != ""
                ? JSON.parse(result.maintainer as unknown as string)
                : null;
          } catch (e) {
            // swallow errors
          }
        }

        this.datasourceService.update(result).subscribe({
          next: () => {
            this.datasources.update((current) => ({
              ...current,
              [harvester.id]: {
                ...harvester,
                ...result,
              },
            }));
          },
          error: (err) => alert(err.message),
        });
      });
  }

  onDuplicate(harvester: Harvester) {
    this.dialog
      .open(DialogEditComponent, {
        data: {
          ...JSON.parse(JSON.stringify(harvester)),
          id: -1,
          index: "",
          description: harvester.description + " (Duplikat)",
        },
        width: "950px",
        disableClose: true,
      })
      .afterClosed()
      .subscribe((result: Harvester) => {
        if (!result) return;
        this.datasourceService.update(result).subscribe({
          next: () => this.fetchDatasources(),
          error: (err) => alert(err.message),
        });
      });
  }

  onSchedule(datasource: Harvester) {
    this.dialog
      .open(DialogSchedulerComponent, {
        width: "500px",
        data: { harvesterType: datasource.type, cron: datasource.cron },
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;
        this.datasourceService.schedule(datasource.id, result.value).subscribe({
          next: (nextExecutions) => {
            if (!nextExecutions) return;
            console.log(nextExecutions);

            // Update cron in datasource.
            this.datasources.update((current) => ({
              ...current,
              [datasource.id]: {
                ...current[datasource.id],
                cron: result.value,
              },
            }));

            // Get the lastest nextExecution from the import log.
            const nextExecution = getLatestDate(nextExecutions.filter(Boolean));
            this.importLogs.update((current) => ({
              ...current,
              [datasource.id]: {
                ...current[datasource.id],
                nextExecution: nextExecution,
              },
            }));
          },
          error: (error) => this.showError(error),
        });
      });
  }

  async showHistory(harvester: Harvester) {
    this.datasourceService.getHistory(harvester.id).subscribe({
      next: (data) => {
        if (!data || data.history.length === 0) {
          return alert(this.translocoPipe.transform("harvester.noHistory"));
        }
        this.dialog.open(DialogHistoryComponent, {
          data: data,
          width: "950px",
        });
      },
      error: (error) => {
        console.error("Error fetching history", error);
      },
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
      this.snackBar.open(
        this.translocoPipe.transform("harvester.noLogs"),
        null,
        { duration: 2 * 1000 },
      );
    }
  }

  private showError(error: Error) {
    console.error("Error occurred", error);
    this.snackBar.open(error.message, null, {
      panelClass: "error",
      duration: 10000,
    });
  }
}
