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
import { FieldType } from "@ngx-formly/material/form-field";
import { FieldTypeConfig, FormlyAttributes, FormlyValidationMessage } from "@ngx-formly/core";
import { MatError, MatFormField, MatInput, MatLabel } from "@angular/material/input";
import { ReactiveFormsModule } from "@angular/forms";
import {
  MatAutocomplete,
  MatAutocompleteTrigger,
  MatOption,
} from "@angular/material/autocomplete";
import { AsyncPipe } from "@angular/common";
import { Observable, of, startWith, switchMap } from "rxjs";
import { map } from "rxjs/operators";

@Component({
  selector: "formly-autocomplete-type",
  templateUrl: "./formly-autocomplete-type.component.html",
  imports: [
    MatFormField,
    MatLabel,
    MatInput,
    ReactiveFormsModule,
    MatAutocompleteTrigger,
    MatAutocomplete,
    AsyncPipe,
    MatOption,
    FormlyAttributes,
    MatError,
    FormlyValidationMessage,
  ],
})
export class FormlyAutocompleteTypeComponent extends FieldType<FieldTypeConfig> {
  filteredOptions: Observable<any>;

  constructor() {
    super();
  }

  ngOnInit() {
    const options = this.normalizeOptions(this.props.options);
    this.filteredOptions = this.formControl?.valueChanges.pipe(
      startWith(this.formControl.value),
      switchMap((value) =>
        options.pipe(
          map((options) => {
            if (!value) return options;
            if (!options) return [];

            return options.filter((option) => {
              return option.label?.toLowerCase().includes(value?.toLowerCase());
            });
          }),
        ),
      ),
    );
  }

  private normalizeOptions(
    options: any[] | Observable<any[]>,
  ): Observable<any[]> {
    return options instanceof Observable ? options : of(options ?? []);
  }
}
