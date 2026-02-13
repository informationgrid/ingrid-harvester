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
          hide: "model.profile != 'ingrid' && model.profile != 'zdm'",
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
                  disabled: true,
                },
              },
              {
                key: "partner",
                type: "input",
                wrappers: ["form-field"],
                className: "ingrid-col-10 ingrid-col-md-auto",
                props: {
                  label: "Partner",
                },
              },
              {
                key: "provider",
                type: "input",
                wrappers: ["form-field"],
                className: "ingrid-col-10 ingrid-col-md-auto",
                props: {
                  label: "Provider",
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
                },
              },
              {
                key: "datatype",
                type: "input",
                wrappers: ["form-field"],
                className: "ingrid-col-10 ingrid-col-md-auto",
                props: {
                  label: "Datatype",
                },
              },
            ],
          },
        ],
      },
    ];
  }
}
