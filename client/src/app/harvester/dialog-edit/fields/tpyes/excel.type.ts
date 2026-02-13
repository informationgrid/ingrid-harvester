import { FormlyFieldConfig } from "@ngx-formly/core";
import { SharedFields } from "../shared.fields";

export abstract class ExcelType {
  static fields(): FormlyFieldConfig[] {
    return [
      {
        expressions: {
          hide: "model.type != 'EXCEL'",
        },
        fieldGroup: [
          {
            key: "filePath",
            type: "input",
            wrappers: ["form-field"],
            props: {
              label: "Dateipfad",
              required: true,
            },
          },
          ...SharedFields.addRules(),
        ],
      },
    ];
  }
}
