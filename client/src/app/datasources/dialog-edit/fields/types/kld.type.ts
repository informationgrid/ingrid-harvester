import { FormlyFieldConfig } from "@ngx-formly/core";
import { SharedFields } from "../shared.fields";

export abstract class KldType {
  static fields(): FormlyFieldConfig[] {
    return [
      {
        expressions: {
          hide: "model.type != 'KLD'",
        },
        fieldGroup: [
          {
            wrappers: ["section"],
            props: {
              label: "KLD Einstellungen",
            },
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
                key: "maxConcurrentTimespan",
                type: "input",
                className: "ingrid-col-10 ingrid-col-md-4",
                props: {
                  label: "Wartezeit zwischen KLD-Anfrage-Paketen (ms)",
                },
              },
            ],
          },
        ],
      },
    ];
  }
}
