import { FormlyFieldConfig } from "@ngx-formly/core";
import { SharedFields } from "../shared.fields";

export abstract class SparqlType {
  static fields(): FormlyFieldConfig[] {
    return [
      {
        expressions: {
          hide: "model.type != 'SPARQL'",
        },
        fieldGroup: [
          {
            wrappers: ["section"],
            props: {
              label: "SPARQL Einstellungen",
            },
            fieldGroup: [
              {
                key: "sourceURL",
                type: "input",
                props: {
                  label: "Endpoint URL",
                  required: true,
                },
                validators: {
                  validation: ["url"],
                },
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
                key: "query",
                type: "textarea",
                props: {
                  label: "Query",
                  rows: 6,
                  attributes: {
                    class: "!font-monospace",
                  },
                },
              },
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
