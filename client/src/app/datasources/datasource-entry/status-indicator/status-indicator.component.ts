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

  statuses = computed(() => this.getStatuses());
  errorNum = computed(() => {
    return (
      this.importLog().summary.numErrors +
      (this.importLog().summary.errors?.length ?? 0) +
      this.importLog().summary.warnings.length
    );
  });

  constructor() {}

  getStatuses() {
    let statuses: Status[] = [];

    if (this.importLog() !== undefined) {
      if (this.importLog().complete == false) {
        statuses.push("importing");
      } else if (this.importLog().summary) {
        if (this.errorNum() > 0) {
          statuses.push("error");
        } else {
          statuses.push("success");
        }
      }
    }

    const cron = this.datasource().cron;
    if (this.datasource().disable) {
      statuses = ["disable"];
    } else if (cron?.full?.active || cron?.incr?.active) {
      statuses.push("cron");
    }

    return statuses;
  }
}
