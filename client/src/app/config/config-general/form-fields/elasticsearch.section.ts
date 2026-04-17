import { FormlyFieldConfig } from "@ngx-formly/core";

export default abstract class ElasticsearchSection {
  static fields(opts: { onEsCheck: any }): FormlyFieldConfig[] {
    return [
      {
        key: "elasticsearch",
        wrappers: ["block", "section", "action"],
        props: {
          label: "Elasticsearch",
          contextHelpId: "config_elasticsearch",
          noDivider: true,
          action: {
            loadingText: "wird getestet...",
            onClick: opts.onEsCheck,
          },
        },
        expressions: {
          "props.action.isLoading": (field) => {
            return field.options?.formState?.elasticsearch?.isLoading;
          },
          "props.action.text": (field) => {
            return field.options?.formState?.elasticsearch?.text;
          },
          "props.action.icon": (field) => {
            return field.options?.formState?.elasticsearch?.icon;
          },
          "props.action.color": (field) => {
            return field.options?.formState?.elasticsearch?.color;
          },
        },
        fieldGroup: [
          {
            fieldGroupClassName: "ingrid-row",
            fieldGroup: [
              {
                key: "version",
                type: "select",
                className: "ingrid-col-10 ingrid-col-md-2",
                defaultValue: "8",
                props: {
                  label: "Version",
                  required: true,
                  options: [
                    {
                      label: "8",
                      value: "8",
                    },
                    {
                      label: "9",
                      value: "9",
                    },
                  ],
                },
              },
              {
                key: "url",
                type: "input",
                className: "ingrid-col-10 ingrid-col-md-auto",
                props: {
                  label: "Host-URL",
                  required: true,
                },
                validators: {
                  validation: ["url"],
                },
              },
            ],
          },
          {
            key: "rejectUnauthorized",
            type: "checkbox",
            defaultValue: true,
            props: {
              label: "Ungültige TLS Zertifikate abweisen",
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
          {
            key: "alias",
            type: "input",
            className: "ingrid-col-10",
            props: {
              label: "Alias-Name",
              required: true,
              maxLength: 24,
              pattern: "^[a-zA-Z0-9_\\-\\.]*$",
            },
            validation: {
              messages: {
                pattern:
                  "Nur Buchstaben, Zahlen, Bindestrich (-), Unterstrich (_) und Punkt (.) erlaubt.",
              },
            },
          },
          {
            wrappers: ["leading"],
            fieldGroupClassName: "ingrid-row",
            props: {
              leading:
                "Index-Settings (readonly) werden beim Start durch Umgebungsvariablen gesetzt:",
            },
            fieldGroup: [
              {
                key: "prefix",
                type: "input",
                className: "ingrid-col-10 ingrid-col-md-auto",
                props: {
                  label: "Index-Präfix",
                  readonly: true,
                },
              },
              {
                key: "index",
                type: "input",
                className: "ingrid-col-10 ingrid-col-md-auto",
                props: {
                  label: "Index-Name",
                  readonly: true,
                },
              },
              {
                key: "numberOfShards",
                type: "input",
                className: "ingrid-col-10 ingrid-col-md-auto",
                props: {
                  label: "Shards",
                  type: "number",
                  readonly: true,
                },
              },
              {
                key: "numberOfReplicas",
                type: "input",
                className: "ingrid-col-10 ingrid-col-md-auto",
                props: {
                  label: "Replicas",
                  type: "number",
                  readonly: true,
                },
              },
            ],
          },
        ],
      },
    ];
  }
}
