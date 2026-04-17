import { FormlyFieldConfig } from "@ngx-formly/core";
import { SharedFields } from "../shared.fields";

export abstract class DcatType {
  static fields(): FormlyFieldConfig[] {
    return [
      {
        expressions: {
          hide: "model.type != 'DCATAPDE'",
        },
        fieldGroup: [
          {
            wrappers: ["section"],
            props: {
              label: "DCAT-AP.de Einstellungen",
            },
            fieldGroup: [
              {
                key: "sourceURL",
                type: "input",
                props: {
                  label: "Catalog URL",
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
                fieldGroupClassName: "ingrid-row",
                fieldGroup: [
                  {
                    key: "filterTags",
                    type: "chip",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: "Filter Tags",
                    },
                  },
                  {
                    key: "filterThemes",
                    type: "chip",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: "Filter Themes",
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ];
  }
}
