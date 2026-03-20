import { FormlyFieldConfig } from "@ngx-formly/core";
import { SharedFields } from "../shared.fields";

export abstract class ExcelSparseType {
  static fields(): FormlyFieldConfig[] {
    return [
      {
        expressions: {
          hide: "model.type != 'EXCEL_SPARSE'",
        },
        fieldGroup: [
          {
            wrappers: ["section"],
            props: {
              label: "Excel (Sparse) Einstellungen",
            },
            fieldGroup: [
              {
                fieldGroupClassName: "ingrid-row",
                fieldGroup: [
                  {
                    key: "title",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: "Katalog-Titel",
                      required: true,
                    },
                  },
                  {
                    key: "language",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-3",
                    props: {
                      label: "Katalog-Sprache",
                      required: true,
                    },
                  },
                ],
              },
              {
                key: "description",
                type: "input",
                props: {
                  label: "Katalog-Beschreibung",
                  required: true,
                },
              },
              {
                key: "filePath",
                type: "input",
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
