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

import { Component, Inject, OnDestroy, OnInit, Optional } from "@angular/core";
import { CronData } from "../../../../../server/app/importer/importer.settings";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { UntypedFormGroup } from "@angular/forms";
import { FormlyFieldConfig } from "@ngx-formly/core";
import { translateCronExpression } from "../../utils/cronUtils";
import { FormDialogComponent } from "../../shared/form-dialog/form-dialog.component";

@Component({
  selector: "app-dialog-scheduler",
  templateUrl: "./dialog-scheduler.component.html",
  styleUrls: ["./dialog-scheduler.component.scss"],
  standalone: false,
})
export class DialogSchedulerComponent implements OnDestroy {
  form = new UntypedFormGroup({});
  formModel: any;
  formFields: FormlyFieldConfig[];

  constructor(
    @Inject(MAT_DIALOG_DATA)
    private data: {
      isIncrementalSupported: boolean;
      cron: { full: CronData; incr: CronData };
    },
    private dialogRef: MatDialogRef<FormDialogComponent>,
  ) {
    this.initForm();
  }

  private initForm() {
    this.formModel = this.data.cron
      ? JSON.parse(JSON.stringify(this.data.cron))
      : {};
    this.formFields = [
      {
        key: "full",
        className: "block",
        fieldGroup: [
          {
            key: "active",
            type: "toggle",
            defaultValue: false,
            props: {
              label: "Komplettes Harvesting",
            },
            expressions: {
              "props.subLabel": this.getCronSubLabel,
            },
          },
          {
            key: "pattern",
            type: "input",
            wrappers: ["form-field", "inline-help"],
            defaultValue: "",
            props: {
              label: "Cron Expression",
              placeholder: "* * * * *",
              description:
                "Syntax: Minute | Stunde | Tag(Monat) | Monat | Wochentag",
              contextHelpId: "config_cron",
            },
            expressions: {
              "props.required": "model.active",
            },
            validators: {
              validation: ["cron"],
            },
          },
        ],
      },
    ];

    if (this.data.isIncrementalSupported) {
      this.formFields.push({
        key: "incr",
        className: "block mt-4",
        fieldGroup: [
          {
            key: "active",
            type: "toggle",
            defaultValue: false,
            props: {
              label: "Inkrementelles Harvesting",
            },
            expressions: {
              "props.subLabel": this.getCronSubLabel,
            },
          },
          {
            key: "pattern",
            type: "input",
            wrappers: ["form-field", "inline-help"],
            defaultValue: "",
            props: {
              label: "Cron Expression",
              placeholder: "* * * * *",
              description:
                "Syntax: Minute | Stunde | Tag(Monat) | Monat | Wochentag",
              contextHelpId: "config_cron",
            },
            expressions: {
              "props.required": "model.active",
            },
            validators: {
              validation: ["cron"],
            },
          },
        ],
      });
    }
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.formModel);
  }

  ngOnDestroy() {
    this.form.reset();
  }

  private getCronSubLabel = (field: FormlyFieldConfig) => {
    if (!field.model.active) return "Planung ausgeschaltet";
    return translateCronExpression(field.form.value.pattern);
  };
}
