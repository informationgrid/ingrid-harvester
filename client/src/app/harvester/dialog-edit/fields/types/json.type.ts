import { FormlyFieldConfig } from "@ngx-formly/core";
import { SharedFields } from "../shared.fields";

export abstract class JsonType {
  static fields(): FormlyFieldConfig[] {
    return [
      {
        expressions: {
          hide: "model.type != 'JSON'",
        },
        fieldGroup: [
          {
            wrappers: ["section"],
            props: {
              label: "JSON Einstellungen",
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
                    key: "idProperty",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-3",
                    props: {
                      label: "ID-Eigenschaftsname",
                      required: true,
                    },
                  },
                ],
              },
              {
                key: "additionalSettings",
                type: "repeat-form",
                props: {
                  label: "Zusätzliche Eigenschaften",
                },
                fieldArray: {
                  fieldGroupClassName: "ingrid-row",
                  fieldGroup: [
                    {
                      key: "key",
                      type: "input",
                      className: "ingrid-col-10 ingrid-col-md-auto",
                      props: {
                        label: "Eigenschaft",
                        required: true,
                      },
                    },
                    {
                      key: "value",
                      type: "input",
                      className: "ingrid-col-10 ingrid-col-md-auto",
                      props: {
                        label: "Wert",
                        required: true,
                      },
                    },
                  ],
                },
                validators: {
                  validation: ["uniqueKey"],
                },
              },
            ],
          },
        ],
      },
    ];
  }
}
