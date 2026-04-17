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

import { inject, Injectable, signal } from "@angular/core";
import { Observable } from "rxjs";
import { Datasource } from "@shared/datasource";
import { ImportLogMessage } from "../../../../../server/app/model/import.result";
import { CronData } from "../../../../../server/app/importer/importer.settings";
import { SocketService } from "./socket.service";
import { MatSnackBar } from "@angular/material/snack-bar";
import { TranslocoService } from "@ngneat/transloco";
import { DatasourceApi } from "./datasource.api";
import { getLatestDate } from "../../utils/dateUtils";

@Injectable({
  providedIn: "root",
})
export class DatasourceService {
  snackBar = inject(MatSnackBar);
  transloco = inject(TranslocoService);

  private _importerTypes = signal<Record<string, any>>({});
  importerTypes = this._importerTypes.asReadonly();

  private _datasources = signal<Record<number, Datasource>>(undefined);
  datasources = this._datasources.asReadonly();

  private _importLogs = signal<Record<number, ImportLogMessage>>(undefined);
  importLogs = this._importLogs.asReadonly();

  constructor(
    private api: DatasourceApi,
    private socketService: SocketService,
  ) {
    this.fetchImporterTypes();
    this.fetchDatasources();
    this.fetchImportLogs();
    this.listenToImportLogChangesFromServer();
    this.listenToConnectionChangesFromServer();
  }

  private fetchImporterTypes() {
    this.api.getImporterTypes().subscribe({
      next: (items) => {
        const importerTypes: Record<string, any> = {};
        for (const item of items) importerTypes[item.type] = item;
        this._importerTypes.set(importerTypes);
        console.log(this.importerTypes());
      },
      error: (error) => console.error("Error fetching importer types", error),
    });
  }

  private fetchDatasources() {
    this.api.getDatasources().subscribe({
      next: (items) => {
        if (!items) return;
        const tempDatasources: Record<number, Datasource> = {};
        for (const item of items) tempDatasources[item.id] = item;
        this._datasources.set(tempDatasources);
        console.log(this.datasources());
      },
      error: (error) => console.error("Error fetching datasources", error),
    });
  }

  private fetchImportLogs() {
    this.api.getLastLogs().subscribe({
      next: (logs) => {
        const tmpImportLogs: Record<number, ImportLogMessage> = {};
        for (const log of logs) tmpImportLogs[log.id] = log;
        this._importLogs.set(tmpImportLogs);
      },
      error: (error) => console.error("Error fetching import logs", error),
    });
  }

  private listenToImportLogChangesFromServer() {
    this.socketService.log$.subscribe({
      next: (data) => this.updateImportLogs(data),
      error: (error) => console.error("Error syncing import logs", error),
    });
  }

  private listenToConnectionChangesFromServer() {
    this.socketService.connectionLost$.subscribe((isLost) => {
      this.snackBar.open(
        this.transloco.translate(
          isLost ? "warnings.lostConnection" : "warnings.recoverConnection",
        ),
        null,
        { duration: 2 * 1000 },
      );

      if (!isLost) {
        this.fetchImportLogs();

        if (!this.datasources()) {
          this.fetchDatasources();
        }
      }
    });
  }

  import(id: number, isIncremental: boolean = false): Observable<void> {
    // Reset the import log.
    this.updateImportLogs({ id, complete: false, stage: "" });

    return this.api.import(id, isIncremental);
  }

  importAll(): Observable<void> {
    // Reset all import logs.
    const importLogs: Record<number, ImportLogMessage> = {};
    for (const id of Object.keys(this.importLogs())) {
      importLogs[id] = { complete: false };
    }
    this._importLogs.set(importLogs);

    return this.api.importAll();
  }

  addOrUpdate(datasource: Datasource) {
    this.api.update(datasource).subscribe({
      next: () => this.fetchDatasources(),
      error: (err) => alert(err.message),
    });
  }

  edit(datasource: Datasource) {
    this.api.update(datasource).subscribe({
      next: () => {
        this._datasources.update((current) => ({
          ...current,
          [datasource.id]: {
            ...datasource,
          },
        }));
      },
      error: (err) => alert(err.message),
    });
  }

  deleteById(id: number) {
    return this.api.delete(id).subscribe({
      next: () => {
        this._datasources.update((current) => {
          const updated = { ...current };
          delete updated[id];
          return updated;
        });
        this._importLogs.update((current) => {
          const updated = { ...current };
          delete updated[id];
          return updated;
        });
      },
      error: (err) => alert(err.message),
    });
  }

  // Returns two dates in an array [full, incr].
  // It can be [null, null], if nothing is scheduled.
  scheduleByCron(
    datasource: Datasource,
    cron: { full: CronData; incr: CronData },
  ) {
    this.api.schedule(datasource.id, cron).subscribe({
      next: (nextExecutions) => {
        if (!nextExecutions) return;

        // Update cron in datasource.
        this._datasources.update((current) => ({
          ...current,
          [datasource.id]: {
            ...current[datasource.id],
            cron: cron,
          },
        }));

        // Get the lastest nextExecution from the import log.
        const nextExecution = getLatestDate(nextExecutions.filter(Boolean));
        this._importLogs.update((current) => ({
          ...current,
          [datasource.id]: {
            ...current[datasource.id],
            nextExecution: nextExecution,
          },
        }));
      },
      error: (err) => alert(err.message),
    });
  }

  getHistory(id: number): Observable<any> {
    return this.api.getHistory(id);
  }

  getJobs(id: number): Observable<any> {
    return this.api.getJobs(id);
  }

  private updateImportLogs(log: ImportLogMessage) {
    this._importLogs.update((current) => ({
      ...current,
      [log.id]: log,
    }));
  }
}
