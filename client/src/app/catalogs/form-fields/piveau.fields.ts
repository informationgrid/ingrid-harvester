import { FormlyFieldConfig } from "@ngx-formly/core";

export default abstract class PiveauFields {
  static fields(): FormlyFieldConfig[] {
    return [
      {
        expressions: {
          hide: "model?.type != 'piveau'",
        },
        fieldGroup: [
          {
            key: "settings",
            wrappers: ["section"],
            props: {
              label: "Piveau",
              noDivider: true,
            },
            fieldGroup: [
              {
                fieldGroupClassName: "ingrid-row",
                fieldGroup: [
                  {
                    key: "catalog",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: "Katalog",
                    },
                  },
                  {
                    key: "title",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: "Titel",
                    },
                  },
                ],
              },
              {
                key: "description",
                type: "input",
                className: "ingrid-col-10",
                props: {
                  label: "Beschreibung",
                },
              },
            ],
          },
        ],
      },
    ];
  }
}
