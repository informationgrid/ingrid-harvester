import { FormlyFieldConfig } from "@ngx-formly/core";
import { SharedFields } from "../shared.fields";
import { oaiXPaths } from "../../../../../../../server/app/importer/oai/oai.paths";

export abstract class OaiType {
  static fields(): FormlyFieldConfig[] {
    return [
      {
        expressions: {
          hide: "model.type != 'OAI'",
        },
        fieldGroup: [
          {
            wrappers: ["section"],
            props: {
              label: "OAI Einstellungen",
            },
            fieldGroup: [
              {
                fieldGroupClassName: "ingrid-row",
                fieldGroup: [
                  {
                    key: "sourceURL",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: "Provider URL",
                      required: true,
                    },
                    validators: {
                      validation: ["url"],
                    },
                  },
                  {
                    key: "metadataPrefix",
                    type: "select",
                    className: "ingrid-col-10 ingrid-col-md-3",
                    props: {
                      label: "Metadaten-Präfix",
                      required: true,
                      options: Object.keys(oaiXPaths).map((key) => ({
                        label: key,
                        value: key,
                      })),
                    },
                  },
                ],
              },
              {
                fieldGroupClassName: "ingrid-row",
                fieldGroup: [
                  {
                    key: "set",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-5",
                    props: {
                      label: "Set",
                    },
                  },
                  {
                    key: "from",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: "Von (ISO-Datum)",
                    },
                  },
                  {
                    key: "until",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: "Bis (ISO-Datum)",
                    },
                  },
                ],
              },
            ],
          },
          {
            wrappers: ["section"],
            props: {
              label: "Filter und Regeln",
            },
            fieldGroup: [
              ...SharedFields.sharedRules(),
              {
                key: "eitherKeywords",
                type: "chip",
                props: {
                  label: "Either keywords",
                },
              },
            ],
          },
        ],
      },
    ];
  }
}
