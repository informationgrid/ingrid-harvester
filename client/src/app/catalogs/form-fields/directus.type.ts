import { FormlyFieldConfig } from "@ngx-formly/core";
import { inject } from "@angular/core";
import { TranslocoPipe } from "@ngneat/transloco";

export default abstract class DirectusType {
  static fields(): FormlyFieldConfig[] {
    const transloco = inject(TranslocoPipe);

    return [
      {
        expressions: {
          hide: "model?.type != 'directus'",
        },
        fieldGroup: [
          {
            key: "settings",
            wrappers: ["section"],
            props: {
              label: "Directus",
              noDivider: true,
            },
            fieldGroup: [
              {
                fieldGroupClassName: "ingrid-row",
                fieldGroup: [
                  {
                    key: "catalogId",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: transloco.transform("catalogs.formLabel.catalogId"),
                      required: true,
                    },
                  },
                  {
                    key: "batchSize",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-3",
                    props: {
                      type: "number",
                      min: 1,
                      placeholder: "100",
                      label: transloco.transform("catalogs.formLabel.batchSize"),
                    },
                  },
                ],
              },
              {
                key: "apiKey",
                type: "input",
                props: {
                  label: transloco.transform("catalogs.formLabel.apiKey"),
                  description: transloco.transform("catalogs.formHint.password"),
                },
              },
            ],
          },
        ],
      },
    ];
  }
}
