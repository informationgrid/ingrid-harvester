import { FormlyFieldConfig } from "@ngx-formly/core";

export default abstract class AdditionalSection {
  static fields(): FormlyFieldConfig[] {
    return [
      {
        wrappers: ["block", "section"],
        props: {
          label: "Zusätzliche Einstellungen",
          contextHelpId: "config_additional_settings",
          noDivider: true,
        },
        fieldGroup: [
          {
            fieldGroupClassName: "ingrid-row",
            fieldGroup: [
              {
                key: "cronOffset",
                type: "input",
                className: "ingrid-col-10 ingrid-col-md-auto",
                props: {
                  label: "Offset Cron-Jobs in Minuten",
                  type: "number",
                  min: 0,
                },
              },
              {
                key: "mappingLogLevel",
                type: "select",
                className: "ingrid-col-10 ingrid-col-md-auto",
                defaultValue: "info",
                props: {
                  label: "Log-Level für fehlende Format-Mappings",
                  required: true,
                  options: [
                    {
                      label: "INFO",
                      value: "info",
                    },
                    {
                      label: "WARNING",
                      value: "warn",
                    },
                  ],
                },
              },
            ],
          },
          {
            key: "proxy",
            type: "input",
            className: "ingrid-col-10",
            props: {
              label: "Proxy URL",
            },
            validators: {
              validation: ["url"],
            },
          },
          {
            key: "allowAllUnauthorizedSSL",
            type: "checkbox",
            className: "ingrid-col-10",
            defaultValue: false,
            props: {
              label: "Unauthorisierte Verbindungen über Proxy erlauben",
            },
          },
          {
            key: "portalUrl",
            type: "input",
            className: "ingrid-col-10",
            props: {
              label: "Portal URL",
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
