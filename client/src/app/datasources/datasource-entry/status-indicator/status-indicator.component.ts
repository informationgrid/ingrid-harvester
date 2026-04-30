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

import { Component, computed, input } from "@angular/core";
import { ImportLogMessage } from "../../../../../../server/app/model/import.result";
import { Datasource } from "@shared/datasource";
import { TranslocoDirective } from "@ngneat/transloco";
import { DatePipe } from "@angular/common";
import {
  Status,
  StatusLabelComponent,
} from "../../../shared/status-label/status-label.component";

@Component({
  selector: "harvester-status-indicator",
  templateUrl: "./status-indicator.component.html",
  styleUrls: ["./status-indicator.component.scss"],
  imports: [TranslocoDirective, DatePipe, StatusLabelComponent],
})
export class StatusIndicatorComponent {
  datasource = input.required<Datasource>();
  importLog = input<ImportLogMessage>();

  /** Result of the last import run — null if no run has completed yet. */
  runStatus = computed<Status | null>(() => {
    const log = this.importLog();
    if (!log) return null;
    if (log.complete === false) return "importing";
    if (log.status) return log.status as Status;
    if (log.summary) {
      const s = log.summary;
      const hasError = log.message || (s.numErrors ?? 0) > 0 || (s.errors?.length ?? 0) > 0;
      return hasError ? "error" : "success";
    }
    return null;
  });

  /** Configuration state of the harvester, independent of run result. */
  configStatuses = computed<Status[]>(() => {
    if (this.datasource().disable) return ["disable"];
    const cron = this.datasource().cron;
    return cron?.full?.active || cron?.incr?.active ? ["cron"] : [];
  });

  statuses = computed<Status[]>(() =>
    [this.runStatus(), ...this.configStatuses()].filter(
      (s): s is Status => s !== null
    )
  );

  /** Total number of errors + warnings from the last completed run, for display in the error tooltip. */
  errorNum = computed<number>(() => {
    const summary = this.importLog()?.summary;
    if (!summary) return 0;
    return summary.numErrors + (summary.errors?.length ?? 0) + summary.warnings.length;
  });

  constructor() {}
}
