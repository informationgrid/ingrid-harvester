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

import { Component, input } from "@angular/core";
import { MatIcon } from "@angular/material/icon";
import { MatTooltip } from "@angular/material/tooltip";

export type Status = "success" | "disable" | "cron" | "importing" | "error";

@Component({
  selector: "ingrid-status-label",
  templateUrl: "./status-label.component.html",
  styleUrls: ["./status-label.component.scss"],
  imports: [MatIcon, MatTooltip],
})
export class StatusLabelComponent {
  status = input.required<Status>();
  label = input<string>();
  tooltip = input<string>();
  svgIcon = input<string>();

  constructor() {}
}
