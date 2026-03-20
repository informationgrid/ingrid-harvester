import { FormlyFieldConfig } from "@ngx-formly/core";
import { inject } from "@angular/core";
import { TranslocoPipe } from "@ngneat/transloco";

export default abstract class PiveauType {
  static fields(): FormlyFieldConfig[] {
    const transloco = inject(TranslocoPipe);

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
                      label: transloco.transform("catalogs.formLabel.catalog"),
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
                    },
                  },
                ],
              },
              {
                fieldGroupClassName: "ingrid-row",
                fieldGroup: [
                  {
                    key: "outputSchema",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: transloco.transform(
                        "catalogs.formLabel.outputSchema",
                      ),
                      required: true,
                    },
                  },
                  {
                    key: "title",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: transloco.transform("catalogs.formLabel.title"),
                    },
                  },
                ],
              },
              {
                key: "description",
                type: "input",
                props: {
                  label: transloco.transform("catalogs.formLabel.description"),
                },
              },
            ],
          },
        ],
      },
    ];
  }
}
