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
import { MatProgressSpinner } from "@angular/material/progress-spinner";

@Component({
  selector: "ingrid-circular-progress-indicator",
  templateUrl: "./circular-progress-indicator.component.html",
  styleUrls: ["./circular-progress-indicator.component.scss"],
  imports: [MatProgressSpinner],
})
export class CircularProgressIndicatorComponent {
  progress = input<number>(undefined);
  size = input<number>(16);
  strokeWidth = input<number>(2.5);

  constructor() {}
}
