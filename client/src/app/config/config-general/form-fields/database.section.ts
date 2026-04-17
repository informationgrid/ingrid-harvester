import { FormlyFieldConfig } from "@ngx-formly/core";

export default abstract class DatabaseSection {
  static fields(opts: { onDbCheck: any }): FormlyFieldConfig[] {
    return [
      {
        key: "database",
        wrappers: ["block", "section", "action"],
        props: {
          label: "Datenbank",
          contextHelpId: "config_database",
          noDivider: true,
          action: {
            loadingText: "wird getestet...",
            onClick: opts.onDbCheck,
          },
        },
        expressions: {
          "props.action.isLoading": (field) => {
            return field.options?.formState?.database?.isLoading;
          },
          "props.action.text": (field) => {
            return field.options?.formState?.database?.text;
          },
          "props.action.icon": (field) => {
            return field.options?.formState?.database?.icon;
          },
          "props.action.color": (field) => {
            return field.options?.formState?.database?.color;
          },
        },
        fieldGroup: [
          {
            fieldGroupClassName: "ingrid-row",
            fieldGroup: [
              {
                key: "type",
                type: "select",
                className: "ingrid-col-10 ingrid-col-md-3",
                defaultValue: "postgresql",
                props: {
                  label: "Datenbank",
                  required: true,
                  options: [
                    {
                      label: "PostgreSQL",
                      value: "postgresql",
                    },
                  ],
                },
              },
              {
                key: "connectionString",
                type: "input",
                className: "ingrid-col-10 ingrid-col-md-auto",
                props: {
                  label: "Verbindungsstring",
                },
              },
            ],
          },
          {
            fieldGroupClassName: "ingrid-row",
            fieldGroup: [
              {
                key: "host",
                type: "input",
                className: "ingrid-col-10 ingrid-col-md-auto",
                props: {
                  label: "URL",
                },
              },
              {
                key: "port",
                type: "input",
                className: "ingrid-col-10 ingrid-col-md-3",
                props: {
                  label: "Port",
                  type: "number",
                  min: 0,
                },
              },
            ],
          },
          {
            key: "database",
            type: "input",
            className: "ingrid-col-10",
            props: {
              label: "Datenbank-Name",
            },
          },
          {
            fieldGroupClassName: "ingrid-row",
            fieldGroup: [
              {
                key: "user",
                type: "input",
                className: "ingrid-col-10 ingrid-col-md-auto",
                props: {
                  label: "Benutzername",
                  required: true,
                },
              },
              {
                key: "password",
                type: "input",
                className: "ingrid-col-10 ingrid-col-md-auto",
                props: {
                  label: "Passwort",
                  type: "password",
                },
              },
            ],
          },
        ],
      },
    ];
  }
}
