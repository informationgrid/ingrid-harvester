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
                    key: "version",
                    type: "select",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: transloco.transform("catalogs.formLabel.version"),
                      required: true,
                      options: [
                        { label: "8", value: "8" },
                        { label: "9", value: "9" },
                      ],
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
                    key: "mappingFile",
                    type: "select",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    defaultValue: "default-mapping",
                    props: {
                      label: transloco.transform("catalogs.formLabel.mapping"),
                      required: true,
                      options: [
                        // TODO these options should come from the backend. they will differ for each profile
                        { label: "Default", value: "default-mapping" },
                        { label: "Opendata", value: "opendata-mapping" },
                      ],
                    },
                  },
                ],
              },
              {
                key: "alias",
                type: "input",
                props: {
                  label: transloco.transform("catalogs.formLabel.alias"),
                  required: true,
                },
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
