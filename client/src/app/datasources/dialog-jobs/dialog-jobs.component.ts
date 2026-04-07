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

import { Component, Inject, signal, ViewChild } from "@angular/core";
import { MAT_DIALOG_DATA } from "@angular/material/dialog";
import { DatasourceApi } from "../services/datasource.api";
import type { JobEntry } from "../../../../../server/app/statistic/jobs.utils";

type JobLog = {
  isVisible: boolean;
  isLoading: boolean;
  lines?: LogLine[];
};

type LogLine = {
  type: string;
  message: string;
};

@Component({
  selector: "app-dialog-jobs",
  templateUrl: "./dialog-jobs.component.html",
  styleUrls: ["./dialog-jobs.component.scss"],
  standalone: false,
})
export class DialogJobsComponent {
  logsByJobId = signal<Record<string, JobLog>>({});

  // Auto scroll to bottom, one a logs container is opened.
  @ViewChild("logsContainer")
  set container(container: any) {
    const el = container?.elementRef?.nativeElement;
    if (el) setTimeout(() => (el.scrollTop = el.scrollHeight));
  }

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { harvester: string; jobs: JobEntry[] },
    private api: DatasourceApi,
  ) {}

  onPanelOpen(job: JobEntry) {
    const log = this.cloneLog(this.logsByJobId()[job.jobId], {
      isVisible: true,
    });
    if (!log.isLoading && !this.logsByJobId()[job.jobId]?.lines) {
      log.isLoading = true;
      this.loadLog(job.jobId, job.harvesterId);
    }
    this.updateLog(job.jobId, log);
  }

  onPanelClose(job: JobEntry) {
    const log: JobLog = this.cloneLog(this.logsByJobId()[job.jobId], {
      isVisible: false,
    });
    this.updateLog(job.jobId, log);
  }

  private loadLog(jobId: string, datasourceId: number): void {
    this.api.getHarvesterLog(datasourceId, jobId).subscribe({
      next: (text) => {
        const log = this.cloneLog(this.logsByJobId()[jobId], {
          isLoading: false,
          lines: this.getLogLines(text?.split("\n")),
        });
        this.updateLog(jobId, log);
      },
      error: () => {
        const log = this.cloneLog(this.logsByJobId()[jobId], {
          isLoading: false,
          lines: this.getLogLines(["Log file not available"]),
        });
        this.updateLog(jobId, log);
      },
    });
  }

  private getLogLines(lines?: string[]): LogLine[] {
    if (!lines) return [];
    return lines.map((line) => {
      let type = "info";
      if (line.includes("[DEBUG]")) {
        type = "debug";
      } else if (line.includes("[WARN]")) {
        type = "warn";
      } else if (line.includes("[ERROR]")) {
        type = "error";
      }
      return { type: type, message: line };
    });
  }

  private cloneLog(
    log: JobLog,
    changes: {
      isVisible?: boolean;
      isLoading?: boolean;
      lines?: LogLine[];
    },
  ): JobLog {
    return {
      isVisible: changes?.isVisible ?? log?.isVisible ?? false,
      isLoading: changes?.isLoading ?? log?.isLoading ?? false,
      lines: changes?.lines ?? log?.lines,
    };
  }

  private updateLog(jobId: string, log: JobLog) {
    this.logsByJobId.update((logs) => ({
      ...logs,
      [jobId]: log,
    }));
  }
}
