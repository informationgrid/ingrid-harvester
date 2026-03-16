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

import { Component } from "@angular/core";
import {
  MatChipGrid,
  MatChipInput,
  MatChipInputEvent, MatChipRemove,
  MatChipRow,
} from "@angular/material/chips";
import { COMMA, ENTER } from "@angular/cdk/keycodes";
import { FieldType, FieldTypeConfig } from "@ngx-formly/core";
import { MatFormField, MatLabel } from "@angular/material/input";
import { MatIcon } from "@angular/material/icon";

@Component({
  selector: "formly-chip-type",
  templateUrl: "./formly-chip-type.component.html",
  imports: [
    MatFormField,
    MatLabel,
    MatChipGrid,
    MatChipRow,
    MatIcon,
    MatChipInput,
    MatChipRemove,
  ],
})
export class FormlyChipTypeComponent extends FieldType<FieldTypeConfig> {
  readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  constructor() {
    super();
  }

  add(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;

    // Add value.
    if (event.value.trim()) {
      const newValues = this.formControl.value
        ? [...this.formControl.value, value]
        : [value];
      this.formControl.patchValue(newValues);
    }

    // Reset the input value.
    if (input) input.value = "";
  }

  remove(value: string): void {
    const index = this.formControl.value?.indexOf(value);
    if (index < 0) return;
    const newValues = this.formControl.value.toSpliced(index, 1);
    this.formControl.patchValue(newValues);
  }
}
