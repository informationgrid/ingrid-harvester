import { FormlyFieldConfig } from "@ngx-formly/core";
import { SharedFields } from "../shared.fields";

export abstract class DcatType {
  static fields(): FormlyFieldConfig[] {
    return [
      {
        expressions: {
          hide: "model.type != 'DCAT'",
        },
        fieldGroup: [
          {
            wrappers: ["section"],
            props: {
              label: "DCAT Einstellungen",
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
              {
                wrappers: ["sub-section"],
                props: {
                  label: "Bereitgestellt durch",
                },
                fieldGroupClassName: "ingrid-row",
                fieldGroup: [
                  {
                    key: "providerPrefix",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: "Präfix",
                      attributes: {
                        autocomplete: "off",
                      },
                    },
                  },
                  {
                    key: "dcatProviderField",
                    type: "select",
                    defaultValue: "creator",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: "DCAT-Feld",
                      options: [
                        { label: "contactPoint", value: "contactPoint" },
                        { label: "creator", value: "creator" },
                        { label: "originator", value: "originator" },
                        { label: "maintainer", value: "maintainer" },
                        { label: "publisher", value: "publisher" },
                      ],
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
