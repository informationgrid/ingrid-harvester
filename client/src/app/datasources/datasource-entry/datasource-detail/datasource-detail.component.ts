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

import { Component, computed, input, output } from "@angular/core";
import { TranslocoDirective, TranslocoPipe } from "@ngneat/transloco";
import { Harvester } from "@shared/harvester";
import { ImportLogMessage } from "../../../../../../server/app/model/import.result";
import { DatePipe } from "@angular/common";
import { DatasourceDetailEntryComponent } from "./datasource-detail-entry/datasource-detail-entry.component";

@Component({
  selector: "harvester-datasource-detail",
  templateUrl: "./datasource-detail.component.html",
  styleUrls: ["./datasource-detail.component.scss"],
  imports: [TranslocoDirective, DatasourceDetailEntryComponent],
  providers: [DatePipe, TranslocoPipe],
})
export class DatasourceDetailComponent {
  datasource = input.required<Harvester>();
  importLog = input<ImportLogMessage>();

  onOpenErrorLog = output<void>();
  onOpenWarningLog = output<void>();

  // Execution info.
  lastExecution = computed(() => {
    if (!this.importLog()?.lastExecution) return "-";
    return this.datePipe.transform(this.importLog().lastExecution, "short");
  });
  executionDuration = computed(() => {
    if (!this.importLog()?.duration) return "-";
    return this.datePipe.transform(
      this.importLog().duration * 1000,
      "HH:mm:ss",
      "UTC",
    );
  });
  nextExecution = computed(() => {
    if (this.datasource().disable) {
      return this.translocoPipe.transform("harvester.status.disable.title");
    }

    const cron = this.datasource().cron;
    if (!cron?.full?.active && !cron?.incr?.active) return "-";

    if (!this.importLog()?.nextExecution) return "-";
    return this.datePipe.transform(this.importLog().nextExecution, "short");
  });

  // Import info.
  docNum = computed(() => {
    if (!this.importLog()?.summary) return "-";
    return (
      this.importLog().summary?.numDocs -
      this.importLog().summary?.skippedDocs.length
    );
  });
  errorNum = computed(() => {
    if (!this.importLog()?.summary) return "-";
    return (
      this.importLog().summary?.numErrors +
      this.importLog().summary?.databaseErrors.length +
      this.importLog().summary?.elasticErrors.length +
      this.importLog().summary?.appErrors.length
    );
  });
  warningNum = computed(() => {
    if (!this.importLog()?.summary) return "-";
    return this.importLog().summary?.warnings.length;
  });

  constructor(
    public datePipe: DatePipe,
    public translocoPipe: TranslocoPipe,
  ) {}
}
