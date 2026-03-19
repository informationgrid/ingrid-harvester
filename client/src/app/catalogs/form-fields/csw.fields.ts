import { FormlyFieldConfig } from "@ngx-formly/core";

export default abstract class CswFields {
  static fields(): FormlyFieldConfig[] {
    return [
      {
        expressions: {
          hide: "model?.type != 'csw'",
        },
        fieldGroup: [
          {
            key: "settings",
            wrappers: ["section"],
            props: {
              label: "CSW",
              noDivider: true,
            },
            fieldGroup: [
              {
                key: "version",
                type: "input",
                className: "ingrid-col-10 ingrid-col-md-3",
                props: {
                  label: "Version",
                },
              },
              {
                key: "outputSchema",
                type: "input",
                className: "ingrid-col-10 ingrid-col-md-auto",
                props: {
                  label: "outputSchema",
                  required: true,
                },
                validators: {
                  validation: ["url"],
                },
              },
            ],
          },
        ],
      },
    ];
  }
}
