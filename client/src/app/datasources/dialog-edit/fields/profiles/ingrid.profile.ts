import { FormlyFieldConfig } from "@ngx-formly/core";

export abstract class IngridProfile {
  static fields(): FormlyFieldConfig[] {
    return [
      {
        wrappers: ["section"],
        props: {
          label: "InGrid Einstellungen",
          contextHelpId: "harvester_settings_profile_ingrid",
        },
        expressions: {
          hide: (field) => {
            return (
              field.options?.formState?.profile != "ingrid" &&
              field.options?.formState?.profile != "zdm"
            );
          },
        },
        fieldGroup: [
          {
            fieldGroupClassName: "ingrid-row",
            fieldGroup: [
              {
                key: "iPlugId",
                type: "input",
                wrappers: ["form-field"],
                className: "ingrid-col-10 ingrid-col-md-auto",
                props: {
                  label: "iPlugId",
                  required: true,
                  maxLength: 24,
                  pattern: '^[a-zA-Z0-9_-]*$',
                },
              },
              {
                key: "partner",
                type: "input",
                wrappers: ["form-field"],
                className: "ingrid-col-10 ingrid-col-md-auto",
                props: {
                  label: "Partner",
                  required: true,
                },
              },
              {
                key: "provider",
                type: "input",
                wrappers: ["form-field"],
                className: "ingrid-col-10 ingrid-col-md-auto",
                props: {
                  label: "Provider",
                  required: true,
                },
              },
            ],
          },
          {
            fieldGroupClassName: "ingrid-row",
            fieldGroup: [
              {
                key: "dataSourceName",
                type: "input",
                wrappers: ["form-field"],
                className: "ingrid-col-10 ingrid-col-md-auto",
                props: {
                  label: "Datasource Name",
                  required: true,
                },
              },
              {
                key: "datatype",
                type: "input",
                wrappers: ["form-field"],
                className: "ingrid-col-10 ingrid-col-md-auto",
                props: {
                  label: "Datatype",
                  required: true,
                },
              },
            ],
          },
        ],
      },
    ];
  }
}
