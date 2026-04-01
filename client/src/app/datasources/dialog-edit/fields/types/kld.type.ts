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
            fieldGroup: [
              {
                key: "sourceURL",
                type: "input",
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
                defaultValue: 200,
                props: {
                  label: "Wartezeit zwischen KLD-Anfrage-Paketen (ms)",
                  type: "number",
                  required: true,
                  min: 1,
                },
              },
            ],
          },
        ],
      },
    ];
  }
}
