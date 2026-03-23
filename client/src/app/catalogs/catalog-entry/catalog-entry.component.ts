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
import { ListItemExpandableComponent } from "../../shared/list-item-expandable/list-item-expandable.component";
import { MatIcon } from "@angular/material/icon";
import { MatIconButton } from "@angular/material/button";
import { MatMenu, MatMenuItem, MatMenuTrigger } from "@angular/material/menu";
import { MatTooltip } from "@angular/material/tooltip";
import { TranslocoDirective } from "@ngneat/transloco";
import { KeyValuePipe } from "@angular/common";
import { DetailItemComponent } from "../../shared/detail-item/detail-item.component";
import { Catalog } from "@shared/catalog";

@Component({
  selector: "harvester-catalog-entry",
  templateUrl: "./catalog-entry.component.html",
  styleUrls: ["./catalog-entry.component.scss"],
  imports: [
    ListItemExpandableComponent,
    MatIcon,
    MatIconButton,
    MatMenu,
    MatMenuItem,
    MatTooltip,
    MatMenuTrigger,
    TranslocoDirective,
    KeyValuePipe,
    DetailItemComponent,
  ],
})
export class CatalogEntryComponent {
  @ViewChild("actionMenuBtn") menuBtn!: MatMenuTrigger;

  catalog = input.required<Catalog>();
  canEdit = input(false);

  onView = output<void>();
  onEdit = output<void>();
  onDuplicate = output<void>();
  onDelete = output<void>();

  constructor() {}

  openActionMenu(evt) {
    evt.stopPropagation();
    this.menuBtn.openMenu();
  }
}
