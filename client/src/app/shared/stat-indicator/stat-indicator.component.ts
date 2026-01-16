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

import { Component, input, output } from "@angular/core";
import { MatIconButton } from "@angular/material/button";
import { MatIcon } from "@angular/material/icon";
import { MatTooltip } from "@angular/material/tooltip";
import { TranslocoDirective } from "@ngneat/transloco";

@Component({
  selector: "stat-indicator",
  templateUrl: "./stat-indicator.component.html",
  imports: [
    MatIconButton,
    MatIcon,
    MatTooltip,
    TranslocoDirective
  ],
  styleUrls: ["./stat-indicator.component.scss"]
})
export class StatIndicatorComponent {
  leading = input<string>();
  value = input<number>();
  text = input<string>();

  canOpenDetail = input<boolean>(false);
  openDetail = output<void>();

  constructor() {
  }
}
