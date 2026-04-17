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

import { Component, input, output, ViewChild } from "@angular/core";
import type { JobEntry } from "@shared/job";
import {
  CdkFixedSizeVirtualScroll,
  CdkVirtualForOf,
  CdkVirtualScrollViewport,
} from "@angular/cdk/scrolling";
import { CircularProgressIndicatorComponent } from "../../../shared/circular-progress-indicator/circular-progress-indicator.component";
import { DatePipe } from "@angular/common";
import { MatDivider } from "@angular/material/list";
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
} from "@angular/material/expansion";
import { StatusLabelComponent } from "../../../shared/status-label/status-label.component";
import { JobLog } from "../dialog-jobs.component";
import { TranslocoDirective } from "@ngneat/transloco";

@Component({
  selector: "harvester-job-entry",
  templateUrl: "./job-entry.component.html",
  styleUrls: ["./job-entry.component.scss"],
  imports: [
    CdkFixedSizeVirtualScroll,
    CdkVirtualForOf,
    CdkVirtualScrollViewport,
    CircularProgressIndicatorComponent,
    DatePipe,
    MatDivider,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    StatusLabelComponent,
    TranslocoDirective,
  ],
})
export class JobEntryComponent {
  job = input.required<JobEntry>();
  jobLog = input<JobLog>();

  onPanelOpen = output<void>();
  onPanelClose = output<void>();

  // Auto scroll to bottom, one a logs container is opened.
  @ViewChild("logsContainer")
  set container(container: any) {
    const el = container?.elementRef?.nativeElement;
    if (el) setTimeout(() => (el.scrollTop = el.scrollHeight));
  }

  constructor() {}
}
