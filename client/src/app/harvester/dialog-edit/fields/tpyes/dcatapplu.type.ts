import { FormlyFieldConfig } from "@ngx-formly/core";
import { SharedFields } from "../shared.fields";

export abstract class DecatappluType {
  static fields(): FormlyFieldConfig[] {
    return [
      {
        expressions: {
          hide: "model.type != 'DCATAPPLU'",
        },
        fieldGroup: [
          {
            wrappers: ["section"],
            props: {
              label: "DCATAPPLU Einstellungen",
            },
            fieldGroup: [
              {
                key: "sourceURL",
                type: "input",
                wrappers: ["form-field"],
                props: {
                  label: "Catalog URL",
                  required: true,
                },
                validators: {
                  validation: ["url"],
                }
              },
            ],
          },
          ...SharedFields.addRules(),
        ],
      },
    ];
  }
}
