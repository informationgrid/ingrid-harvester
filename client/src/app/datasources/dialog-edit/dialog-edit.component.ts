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

import { Component, Inject } from "@angular/core";
import { UntypedFormGroup } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { Harvester } from "@shared/harvester";
import { ConfigService } from "../../config/config.service";
import { FormlyFieldConfig, FormlyFormOptions } from "@ngx-formly/core";
import { SharedFields } from "./fields/shared.fields";
import { IngridProfile } from "./fields/profiles/ingrid.profile";
import { ExcelType } from "./fields/types/excel.type";
import { CkanType } from "./fields/types/ckan.type";
import { CswType } from "./fields/types/csw.type";
import { DcatType } from "./fields/types/dcat.type";
import { DecatappluType } from "./fields/types/dcatapplu.type";
import { ExcelSparseType } from "./fields/types/excel-sparse.type";
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
  form = new UntypedFormGroup({});
  fields: FormlyFieldConfig[];
  model: any = {};
  options: FormlyFormOptions = {};

  constructor(
    @Inject(MAT_DIALOG_DATA) public harvester: Harvester,
    public dialogRef: MatDialogRef<DialogEditComponent>,
    private configService: ConfigService,
  ) {
    this.initForm();
  }

  initForm() {
    this.configService.getProfileName().subscribe((profile) => {
      // Set initial values.
      this.model = this.getInitialValues(this.harvester);

      // Set options used by initializing fields.
      this.options = {
        formState: {
          profile,
          catalogs: this.configService.getCatalogs(),
        },
      };

      // Build fields.
      this.fields = [
        ...SharedFields.general(),
        ...IngridProfile.fields(),
        ...CkanType.fields(),
        ...CswType.fields(),
        ...DcatType.fields(),
        ...DecatappluType.fields(),
        ...ExcelSparseType.fields(),
        ...ExcelType.fields(),
        ...JsonType.fields(),
        ...KldType.fields(),
        ...OaiType.fields(),
        ...SparqlType.fields(),
        ...WfsType.fields(),
        ...GenesisType.fields(),
        ...SharedFields.additional(),
      ];
    });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const result = this.getSubmitValues(this.harvester, this.model);
    this.dialogRef.close(result);
  }

  getInitialValues(harvester: any) {
    const values = { ...harvester };

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

  getSubmitValues(oldValues, newValues) {
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
