import { FormlyFieldConfig } from "@ngx-formly/core";

export default abstract class ElasticsearchFields {
  static fields(): FormlyFieldConfig[] {
    return [
      {
        expressions: {
          hide: "model?.type != 'elasticsearch'",
        },
        fieldGroup: [
          {
            key: "settings",
            wrappers: ["section"],
            props: {
              label: "Elasticsearch",
              noDivider: true,
            },
            fieldGroup: [
              {
                fieldGroupClassName: "ingrid-row",
                fieldGroup: [
                  {
                    key: "alias",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: "Alias",
                    },
                  },
                  {
                    key: "index",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: "Index",
                    },
                  },
                  {
                    key: "version",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: "Version",
                      type: "number",
                      min: 1,
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
