import { FormlyFieldConfig } from "@ngx-formly/core";

export default abstract class SharedFields {
  static general(): FormlyFieldConfig[] {
    return [
      {
        wrappers: ["section"],
        props: {
          label: "Allgemeine Einstellungen",
        },
        expressions: {
          "props.noDivider": "model?.type == undefined"
        },
        fieldGroup: [
          {
            fieldGroupClassName: "ingrid-row",
            fieldGroup: [
              {
                key: "type",
                type: "select",
                wrappers: ["form-field"],
                className: "ingrid-col-10 ingrid-col-md-3",
                props: {
                  label: "Typ",
                  required: true,
                  options: [
                    { label: "CSW", value: "csw" },
                    { label: "Elasticsearch", value: "elasticsearch" },
                    { label: "Piveau", value: "piveau" },
                  ],
                },
              },
              {
                key: "name",
                type: "input",
                className: "ingrid-col-10 ingrid-col-md-auto",
                props: {
                  label: "Name",
                  required: true,
                },
              },
            ],
          },
          {
            key: "url",
            type: "input",
            className: "ingrid-col-10",
            props: {
              label: "URL",
              required: true,
            },
            validators: {
              validation: ["url"],
            },
          },
        ],
      },
    ];
  }
}
