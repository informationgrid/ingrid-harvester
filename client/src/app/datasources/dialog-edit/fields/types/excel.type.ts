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
            wrappers: ["section"],
            props: {
              label: "Excel Einstellungen",
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
            ],
          },
          {
            wrappers: ["section"],
            props: {
              label: "Filter und Regeln",
            },
            fieldGroup: [...SharedFields.sharedRules()],
          },
        ],
      },
    ];
  }
}
