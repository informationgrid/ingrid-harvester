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

import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DatasourceApi } from '../services/datasource.api';

@Component({
  selector: 'app-dialog-jobs',
  templateUrl: './dialog-jobs.component.html',
  styleUrls: ['./dialog-jobs.component.scss'],
  standalone: false,
})
export class DialogJobsComponent {
  logCache = new Map<string, string>();
  logLoading = new Map<string, boolean>();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { harvester: string; jobs: any[] },
    private api: DatasourceApi,
  ) {}

  catalogStages(job: any): any[] {
    return (job.stages ?? []).filter((p: any) => p.name?.startsWith('catalog/'));
  }

  loadLog(job: any): void {
    if (this.logCache.has(job.jobId) || this.logLoading.get(job.jobId)) {
      return;
    }
    this.logLoading.set(job.jobId, true);
    this.api.getHarvesterLog(job.harvesterId, job.jobId).subscribe({
      next: (text) => {
        this.logCache.set(job.jobId, text);
        this.logLoading.set(job.jobId, false);
      },
      error: () => {
        this.logCache.set(job.jobId, '(Log file not available)');
        this.logLoading.set(job.jobId, false);
      },
    });
  }

  logLines(jobId: string): string[] {
    return this.logCache.get(jobId)?.split('\n') ?? [];
  }

  determineClass(line: string): string {
    if (line.includes('[DEBUG]')) return 'debug';
    if (line.includes('[WARN]'))  return 'warn';
    if (line.includes('[ERROR]')) return 'error';
    return 'info';
  }
}
