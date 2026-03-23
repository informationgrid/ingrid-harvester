import { FormlyFieldConfig } from "@ngx-formly/core";
import { inject } from "@angular/core";
import { TranslocoPipe } from "@ngneat/transloco";

export default abstract class ElasticsearchType {
  static fields(): FormlyFieldConfig[] {
    const transloco = inject(TranslocoPipe);

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
                      label: transloco.transform("catalogs.formLabel.alias"),
                      required: true,
                    },
                  },
                  {
                    key: "index",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: transloco.transform("catalogs.formLabel.index"),
                      required: true,
                    },
                  },
                  {
                    key: "version",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: transloco.transform("catalogs.formLabel.version"),
                      required: true,
                      type: "number",
                      min: 1,
                    },
                  },
                ],
              },
              {
                key: "user",
                type: "input",
                props: {
                  label: transloco.transform("catalogs.formLabel.user"),
                },
              },
              {
                key: "password",
                type: "input",
                props: {
                  label: transloco.transform("catalogs.formLabel.password"),
                  description: transloco.transform("catalogs.formHint.password")
                },
              },
            ],
          },
        ],
      },
    ];
  }
}
