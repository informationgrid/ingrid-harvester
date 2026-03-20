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

import { FormlyFieldConfig } from "@ngx-formly/core";
import { SharedFields } from "../shared.fields";

export abstract class GenesisType {
  static fields(): FormlyFieldConfig[] {
    return [
      {
        expressions: {
          hide: "model.type != 'GENESIS'",
        },
        fieldGroup: [
          {
            wrappers: ["section"],
            props: { label: "GENESIS Einstellungen" },
            fieldGroup: [
              {
                fieldGroupClassName: "ingrid-row",
                fieldGroup: [
                  {
                    key: "sourceURL",
                    type: "input",
                    className: "ingrid-col-10",
                    props: {
                      label: "Quell-URL",
                      required: true,
                    },
                  },
                ],
              },
              {
                fieldGroupClassName: "ingrid-row",
                fieldGroup: [
                  {
                    key: "maxConcurrent",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: "Anzahl paralleler Abfragen",
                      type: "number",
                      required: true,
                      min: 1,
                    },
                  },
                ],
              },
              {
                key: "typeConfig",
                fieldGroup: [
                  {
                    key: "tableSelections",
                    type: "chip",
                    props: { label: "Tabellenauswahl" },
                  },
                  {
                    fieldGroupClassName: "ingrid-row",
                    fieldGroup: [
                      {
                        key: "requestDelayMs",
                        type: "input",
                        className: "ingrid-col-10 ingrid-col-md-auto",
                        props: {
                          label: "Verzögerung zwischen Anfragen (ms)",
                          type: "number",
                          min: 0,
                        },
                      },
                    ],
                  },
                  {
                    fieldGroupClassName: "ingrid-row",
                    fieldGroup: [
                      {
                        key: "apiToken",
                        type: "input",
                        className: "ingrid-col-10",
                        props: {
                          label: "API-Token (alternativ zu Benutzername/Passwort)",
                        },
                      },
                    ],
                  },
                  {
                    fieldGroupClassName: "ingrid-row",
                    fieldGroup: [
                      {
                        key: "username",
                        type: "input",
                        className: "ingrid-col-10 ingrid-col-md-auto",
                        props: { label: "Benutzername" },
                      },
                      {
                        key: "password",
                        type: "input",
                        className: "ingrid-col-10 ingrid-col-md-auto",
                        props: {
                          label: "Passwort",
                          type: "password",
                        },
                      },
                    ],
                  },
                  {
                    fieldGroupClassName: "ingrid-row",
                    fieldGroup: [
                      {
                        key: "downloadUrlTemplate",
                        type: "input",
                        className: "ingrid-col-10",
                        props: { label: "Download-URL-Vorlage" },
                      },
                    ],
                  },
                  {
                    fieldGroupClassName: "ingrid-row",
                    fieldGroup: [
                      {
                        key: "theme",
                        type: "input",
                        className: "ingrid-col-10",
                        props: { label: "Thema (URI)" },
                      },
                    ],
                  },
                  {
                    fieldGroupClassName: "ingrid-row",
                    fieldGroup: [
                      {
                        key: "licenseUrl",
                        type: "input",
                        className: "ingrid-col-10",
                        props: { label: "Lizenz-URL" },
                      },
                    ],
                  },
                  {
                    fieldGroupClassName: "ingrid-row",
                    fieldGroup: [
                      {
                        key: "contributorId",
                        type: "input",
                        className: "ingrid-col-10",
                        props: { label: "Beitragende-ID" },
                      },
                    ],
                  },
                  {
                    key: "publisher",
                    fieldGroup: [
                      {
                        fieldGroupClassName: "ingrid-row",
                        fieldGroup: [
                          {
                            key: "name",
                            type: "input",
                            className: "ingrid-col-10 ingrid-col-md-auto",
                            props: { label: "Herausgeber Name" },
                          },
                          {
                            key: "email",
                            type: "input",
                            className: "ingrid-col-10 ingrid-col-md-auto",
                            props: { label: "Herausgeber E-Mail" },
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            wrappers: ["section"],
            props: { label: "Filter und Regeln" },
            fieldGroup: [...SharedFields.sharedRules()],
          },
        ],
      },
    ];
  }
}
