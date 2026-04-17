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

import { Component, Inject, OnDestroy } from "@angular/core";
import { UntypedFormGroup } from "@angular/forms";
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
} from "@angular/material/dialog";
import { FormlyFieldConfig, FormlyForm } from "@ngx-formly/core";
import { DialogHeaderComponent } from "../dialog-header/dialog-header.component";
import { MatButton } from "@angular/material/button";
import { TranslocoDirective } from "@ngneat/transloco";
import { CdkDrag, CdkDragHandle } from "@angular/cdk/drag-drop";

@Component({
  selector: "ingrid-form-dialog",
  templateUrl: "./form-dialog.component.html",
  styleUrls: ["./form-dialog.component.scss"],
  imports: [
    DialogHeaderComponent,
    MatDialogContent,
    MatDialogActions,
    MatButton,
    MatDialogClose,
    TranslocoDirective,
    FormlyForm,
    CdkDrag,
    CdkDragHandle,
  ],
})
export class FormDialogComponent implements OnDestroy {
  form = new UntypedFormGroup({});
  formFields: FormlyFieldConfig[];
  formModel: any;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<FormDialogComponent>,
  ) {
    this.formFields = this.data?.fields ?? [];

    // Mirror the initial values to the model
    // to prevent modifying the original object.
    this.formModel = this.data?.initialValues
      ? JSON.parse(JSON.stringify(this.data.initialValues))
      : {};
  }

  ngOnDestroy() {
    this.form.reset();
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.formModel);
  }
}
