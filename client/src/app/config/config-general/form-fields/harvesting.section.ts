import { FormlyFieldConfig } from "@ngx-formly/core";

export default abstract class HarvestingSection {
  static fields(): FormlyFieldConfig[] {
    return [
      {
        key: "harvesting",
        wrappers: ["block", "section", "leading"],
        props: {
          label: "Harvesting Differenzen",
          contextHelpId: "config_harvesting_differences",
          leading:
            "Wenn bereits bestehende Datensätze nicht im laufenden Harvesting vorhanden sind, dann",
          noDivider: true,
        },
        fieldGroup: [
          {
            key: "email",
            fieldGroupClassName: "ingrid-row",
            fieldGroup: [
              {
                key: "enabled",
                type: "checkbox",
                className: "ingrid-col-10 ingrid-col-md-auto",
                defaultValue: false,
                props: {
                  label: "E-Mail Benachrichtigung aktivieren",
                },
              },
              {
                key: "minDifference",
                type: "input",
                className: "ingrid-col-10 ingrid-col-md-auto",
                defaultValue: 10,
                props: {
                  label: "E-Mail senden ab einer Differenz von (%)",
                  required: true,
                  type: "number",
                  min: 1,
                  max: 100,
                },
              },
            ],
          },
          {
            key: "cancel",
            fieldGroupClassName: "ingrid-row",
            fieldGroup: [
              {
                key: "enabled",
                type: "checkbox",
                className: "ingrid-col-10 ingrid-col-md-auto",
                defaultValue: false,
                props: {
                  label: "Harvesting Abbruch aktivieren",
                },
              },
              {
                key: "minDifference",
                type: "input",
                className: "ingrid-col-10 ingrid-col-md-auto",
                defaultValue: 10,
                props: {
                  label: "Harvesting abbrechen ab einer Differenz von (%)",
                  required: true,
                  type: "number",
                  min: 1,
                  max: 100,
                },
              },
            ],
          },
        ],
      },
    ];
  }
}
