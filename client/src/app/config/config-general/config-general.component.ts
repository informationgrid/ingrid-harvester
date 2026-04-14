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

import { Component, OnInit } from "@angular/core";
import { ConfigService } from "../config.service";
import { UntypedFormGroup } from "@angular/forms";
import { delay } from "rxjs/operators";
import { FormlyFieldConfig, FormlyFormOptions } from "@ngx-formly/core";
import DatabaseSection from "./form-fields/database.section";
import ElasticsearchSection from "./form-fields/elasticsearch.section";
import AdditionalSection from "./form-fields/additional.section";
import HarvestingSection from "./form-fields/harvesting.section";
import EmailSection from "./form-fields/email.section";
import ChecksSection from "./form-fields/checks.section";
import BackupSection from "./form-fields/backup.section";
import { MatSnackBar } from "@angular/material/snack-bar";

@Component({
  selector: "app-config-general",
  templateUrl: "./config-general.component.html",
  styleUrls: ["./config-general.component.scss"],
  standalone: false,
})
export class ConfigGeneralComponent implements OnInit {
  form = new UntypedFormGroup({});
  formModel: any;
  formFields: FormlyFieldConfig[];
  formOptions: FormlyFormOptions;

  constructor(
    private configService: ConfigService,
    private snackbar: MatSnackBar,
  ) {}

  ngOnInit() {
    this.initForm();
  }

  initForm() {
    this.configService.fetch().subscribe({
      next: (data) => {
        this.formModel = data;
        this.formOptions = {
          formState: {
            database: {
              isLoading: false,
              text: "Verbindung testen",
              icon: "cloud",
              color: "primary",
            },
            elasticsearch: {
              isLoading: false,
              text: "Verbindung testen",
              icon: "cloud",
              color: "primary",
            },
          },
        };
        this.formFields = [
          ...DatabaseSection.fields({
            onDbCheck: () => this.onDbCheck(),
          }),
          ...ElasticsearchSection.fields({
            onEsCheck: () => this.onEsCheck(),
          }),
          ...AdditionalSection.fields(),
          ...ChecksSection.fields(),
          ...BackupSection.fields(),
          ...HarvestingSection.fields(),
          ...EmailSection.fields(),
        ];
      },
      error: (error) => {
        console.error(error);
      },
    });
  }

  onDbCheck() {
    this.formOptions.formState.database.isLoading = true;
    this.configService
      .checkDbConnection({ ...this.formModel.database })
      .pipe(delay(1000))
      .subscribe({
        next: (isConnected) => {
          this.formOptions.formState.database = this.getTestState(isConnected);
        },
        error: (error) => {
          this.formOptions.formState.database = this.getTestState(false);
        },
      });
  }

  onEsCheck() {
    this.formOptions.formState.elasticsearch.isLoading = true;
    this.configService
      .checkEsConnection({ ...this.formModel.elasticsearch })
      .pipe(delay(1000))
      .subscribe({
        next: (isConnected) => {
          this.formOptions.formState.elasticsearch =
            this.getTestState(isConnected);
        },
        error: (error) => {
          this.formOptions.formState.elasticsearch = this.getTestState(false);
        },
      });
  }

  private getTestState(isConnected: boolean) {
    return {
      isLoading: false,
      text: isConnected
        ? "Verbindung erfolgreich"
        : "Verbindung fehlgeschlagen",
      icon: isConnected ? "Success" : "error",
      color: isConnected ? "primary" : "warn",
    };
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackbar.open("Manche Felder sind ungültig.", null, {
        duration: 3 * 1000,
        panelClass: ["error"],
      });
      return;
    }

    this.configService.save({ ...this.formModel }).subscribe({
      next: () => {
        this.snackbar.open("Konfiguration erfolgreich gespeichert.", null, {
          duration: 3 * 1000,
          panelClass: ["success"],
        });
      },
    });
  }
}
