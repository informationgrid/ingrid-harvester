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

import { Component, input, OnInit } from "@angular/core";
import { MatExpansionPanel, MatExpansionPanelHeader } from "@angular/material/expansion";
import { MatDivider } from "@angular/material/list";

@Component({
  selector: "ingrid-list-item-expandable",
  templateUrl: "./list-item-expandable.component.html",
  styleUrls: ["./list-item-expandable.component.scss"],
  imports: [
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatDivider,
  ],
})
export class ListItemExpandableComponent implements OnInit {
  title = input<string>();
  subtitle = input<string>();
  hideToggle = input<boolean>(true);

  constructor() {}

  ngOnInit(): void {}
}
