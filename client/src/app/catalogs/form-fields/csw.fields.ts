import { FormlyFieldConfig } from "@ngx-formly/core";
import { inject } from "@angular/core";
import { TranslocoPipe } from "@ngneat/transloco";

export default abstract class CswFields {
  static fields(): FormlyFieldConfig[] {
    const transloco = inject(TranslocoPipe);

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
                key: "outputSchema",
                type: "input",
                className: "ingrid-col-10 ingrid-col-md-auto",
                props: {
                  label: transloco.transform("catalogs.formLabel.outputSchema"),
                  required: true,
                },
                validators: {
                  validation: ["url"],
                },
              },
              {
                key: "version",
                type: "input",
                className: "ingrid-col-10 ingrid-col-md-3",
                props: {
                  label: transloco.transform("catalogs.formLabel.version"),
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
