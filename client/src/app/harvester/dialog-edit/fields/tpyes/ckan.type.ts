import { FormlyFieldConfig } from "@ngx-formly/core";
import { SharedFields } from "../shared.fields";

export abstract class CkanType {
  static fields(): FormlyFieldConfig[] {
    return [
      {
        wrappers: ["section"],
        props: {
          label: "CKAN",
        },
        expressions: {
          hide: "model.type != 'CKAN'",
        },
        fieldGroup: [
          {
            key: "sourceURL",
            type: "input",
            wrappers: ["form-field"],
            props: {
              label: "CKAN Basis URL",
              required: true,
            },
          },
          {
            wrappers: ["sub-section"],
            props: {
              label: "API",
            },
            fieldGroup: [
              {
                fieldGroupClassName: "ingrid-row",
                fieldGroup: [
                  {
                    key: "requestType",
                    type: "select",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: "API Funktion",
                      options: [
                        {
                          label: "ListWithResources",
                          value: "ListWithResources",
                        },
                        { label: "Search", value: "Search" },
                      ],
                    },
                  },
                  {
                    key: "additionalSearchFilter",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: "Zusätzlicher Filter Search-API",
                    },
                  },
                ],
              },
              {
                fieldGroupClassName: "ingrid-row",
                fieldGroup: [
                  {
                    key: "markdownAsDescription",
                    type: "checkbox",
                    className:
                      "ingrid-checkbox ingrid-col-10 ingrid-col-md-auto",
                    defaultValue: false,
                    props: {
                      label: "Beschreibung als Markdown",
                    },
                  },
                  {
                    key: "groupChilds",
                    type: "checkbox",
                    className:
                      "ingrid-checkbox ingrid-col-10 ingrid-col-md-auto",
                    defaultValue: false,
                    props: {
                      label: "Datensatzreihen zusammenfassen",
                    },
                  },
                ],
              },
            ],
          },
          {
            wrappers: ["sub-section"],
            props: {
              label: "Bereitgestellt durch",
            },
            fieldGroup: [
              {
                fieldGroupClassName: "ingrid-row",
                fieldGroup: [
                  {
                    key: "providerPrefix",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: "Präfix",
                    },
                  },
                  {
                    key: "providerField",
                    type: "select",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    defaultValue: "organization",
                    props: {
                      label: "CKAN-Feld",
                      options: [
                        { label: "maintainer", value: "maintainer" },
                        { label: "organization", value: "organization" },
                        { label: "author", value: "author" },
                      ],
                    },
                  },
                ],
              },
              {
                key: "dateSourceFormats",
                type: "chip",
                props: {
                  label: "Datumsformate",
                },
              },
            ],
          },
          {
            key: "defaultLicense",
            wrappers: ["sub-section"],
            props: {
              label: "Default-Lizenz",
            },
            fieldGroupClassName: "ingrid-row",
            fieldGroup: [
              {
                key: "id",
                type: "input",
                className: "ingrid-col-10 ingrid-col-md-2",
                props: {
                  label: "ID",
                },
              },
              {
                key: "title",
                type: "input",
                className: "ingrid-col-10 ingrid-col-md-4",
                props: {
                  label: "Titel",
                },
              },
              {
                key: "url",
                type: "input",
                className: "ingrid-col-10 ingrid-col-md-4",
                props: {
                  label: "URL",
                },
              },
            ],
          },
          ...SharedFields.addRules(),
        ],
      },
    ];
  }
}
