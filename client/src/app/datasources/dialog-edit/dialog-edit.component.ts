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

import { Component, Inject, signal } from "@angular/core";
import { FormGroup, UntypedFormGroup } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { ConfigService } from "../../config/config.service";
import { FormlyFieldConfig, FormlyFormOptions } from "@ngx-formly/core";
import { SharedFields } from "./fields/shared.fields";
import { IngridProfile } from "./fields/profiles/ingrid.profile";
import { CkanType } from "./fields/types/ckan.type";
import { CswType } from "./fields/types/csw.type";
import { DcatType } from "./fields/types/dcat.type";
import { DecatappluType } from "./fields/types/dcatapplu.type";
import { JsonType } from "./fields/types/json.type";
import { KldType } from "./fields/types/kld.type";
import { OaiType } from "./fields/types/oai.type";
import { SparqlType } from "./fields/types/sparql.type";
import { WfsType } from "./fields/types/wfs.type";
import { GenesisType } from "./fields/types/genesis.type";

@Component({
  selector: "app-dialog-edit",
  templateUrl: "./dialog-edit.component.html",
  styleUrls: ["./dialog-edit.component.scss"],
  standalone: false,
})
export class DialogEditComponent {
  isLoaded = signal<boolean>(false);

  form: FormGroup;
  formModel: any;
  formOptions: FormlyFormOptions;

  // All fields with conditional visibility.
  // The order of the fields matters.
  fields: FormlyFieldConfig[] = [
    ...SharedFields.general(),
    ...IngridProfile.fields(),
    ...CkanType.fields(),
    ...CswType.fields(),
    ...DcatType.fields(),
    ...DecatappluType.fields(),
    ...JsonType.fields(),
    ...KldType.fields(),
    ...OaiType.fields(),
    ...SparqlType.fields(),
    ...WfsType.fields(),
    ...GenesisType.fields(),
    ...SharedFields.additional(),
  ];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<DialogEditComponent>,
    private configService: ConfigService,
  ) {
    // Init form.
    this.form = new UntypedFormGroup({});
    this.formModel = this.getInitialValues(data.datasource);
    this.configService.getProfileName().subscribe({
      next: (profile) => {
        this.formOptions = {
          formState: {
            profile,
            catalogs: this.configService.getCatalogs(),
          },
        };
        this.isLoaded.set(true);
      },
    });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const result = this.getSubmitValues(this.data.datasource, this.formModel);
    this.dialogRef.close(result);
  }

  getInitialValues(datasource: any) {
    const values = JSON.parse(JSON.stringify(datasource));

    // Modify values for the format of the input field.
    if (values.additionalSettings) {
      values.additionalSettings = Object.entries(values.additionalSettings).map(
        ([key, value]) => ({ key, value }),
      );
    }

    // Convert JSON object to string for the input field.
    if (values.contactMetadata) {
      values.contactMetadata = JSON.stringify(values.contactMetadata, null, 2);
    }
    if (values.maintainer) {
      values.maintainer = JSON.stringify(values.maintainer, null, 2);
    }

    return values;
  }

  getSubmitValues(oldValues: any, newValues: any) {
    const values = { ...oldValues, ...newValues };

    // Reverse values to the server format.
    if (values.additionalSettings) {
      values.additionalSettings = values.additionalSettings.reduce(
        (acc, cur) => {
          acc[cur.key] = cur.value;
          return acc;
        },
        {} as Record<string, string>,
      );
    }

    // Remove the field when its values are empty.
    if (values.type == "CKAN" && values.defaultLicense) {
      const license = values.defaultLicense;
      if (
        license.id.trim().length === 0 &&
        license.title.trim().length === 0 &&
        license.url.trim().length === 0
      ) {
        values.defaultLicense = null;
      }
    }

    // Reverse string to JSON object.
    if (values.contactMetadata) {
      values.contactMetadata = JSON.parse(values.contactMetadata);
    }
    if (values.maintainer) {
      values.maintainer = JSON.parse(values.maintainer);
    }

    return values;
  }

  protected readonly console = console;
}
