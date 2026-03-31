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
import { Datasource } from "@shared/datasource";
import { ImportLogMessage } from "../../../../../server/app/model/import.result";
import { TranslocoDirective } from "@ngneat/transloco";
import { StatusIndicatorComponent } from "./status-indicator/status-indicator.component";
import { MatIcon } from "@angular/material/icon";
import { MatIconButton } from "@angular/material/button";
import { MatTooltip } from "@angular/material/tooltip";
import { MatMenu, MatMenuItem, MatMenuTrigger } from "@angular/material/menu";
import { ProgressIndicatorComponent } from "./progress-indicator/progress-indicator.component";
import { DatasourceDetailComponent } from "./datasource-detail/datasource-detail.component";
import { ListItemExpandableComponent } from "../../shared/list-item-expandable/list-item-expandable.component";

@Component({
  selector: "harvester-datasource-entry",
  templateUrl: "./datasource-entry.component.html",
  styleUrl: "./datasource-entry.component.scss",
  imports: [
    TranslocoDirective,
    StatusIndicatorComponent,
    MatIcon,
    MatIconButton,
    MatTooltip,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    ProgressIndicatorComponent,
    DatasourceDetailComponent,
    ListItemExpandableComponent,
  ],
})
export class DatasourceEntryComponent {
  @ViewChild("actionMenuBtn") menuBtn!: MatMenuTrigger;

  datasource = input.required<Datasource>();
  canEdit = input<boolean>(true);
  importLog = input<ImportLogMessage>();

  onImport = output<void>();
  onIncrementImport = output<void>();
  onView = output<void>();
  onEdit = output<void>();
  onDelete = output<void>();
  onDuplicate = output<void>();
  onSchedule = output<void>();
  onHistory = output<void>();
  onJobs = output<void>();
  onOpenErrorLog = output<void>();
  onOpenWarningLog = output<void>();

  constructor() {}

  openActionMenu(evt) {
    evt.stopPropagation();
    this.menuBtn.openMenu();
  }
}
