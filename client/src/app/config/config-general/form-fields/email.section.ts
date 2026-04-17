import { FormlyFieldConfig } from "@ngx-formly/core";

export default abstract class EmailSection {
  static fields(): FormlyFieldConfig[] {
    return [
      {
        key: "mail",
        wrappers: ["block", "section"],
        props: {
          label: "E-Mail-Einstellungen",
          contextHelpId: "config_email",
          noDivider: true,
        },
        fieldGroup: [
          {
            key: "enabled",
            type: "checkbox",
            className: "ingrid-col-10",
            defaultValue: false,
            props: {
              label: "E-Mail-Benachrichtigungen an- / ausschalten",
            },
          },
          {
            key: "mailServer",
            wrappers: ["leading"],
            props: {
              leading: "Server",
            },
            fieldGroup: [
              {
                fieldGroupClassName: "ingrid-row",
                fieldGroup: [
                  {
                    key: "host",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    defaultValue: "",
                    props: {
                      label: "E-Mail-Server",
                      required: true,
                    },
                  },
                  {
                    key: "port",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-3",
                    defaultValue: 451,
                    props: {
                      label: "Port",
                      required: true,
                      type: "number",
                      min: 0,
                    },
                  },
                ],
              },
              {
                key: "auth",
                fieldGroupClassName: "ingrid-row",
                fieldGroup: [
                  {
                    key: "user",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    defaultValue: "",
                    props: {
                      label: "User",
                    },
                  },
                  {
                    key: "pass",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    defaultValue: "",
                    props: {
                      label: "Passwort",
                      type: "password",
                    },
                  },
                ],
              },
              {
                fieldGroupClassName: "ingrid-row",
                fieldGroup: [
                  {
                    key: "secure",
                    type: "checkbox",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    defaultValue: false,
                    props: {
                      label: "Secure Connection",
                    },
                  },
                  {
                    key: "tls",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    fieldGroup: [
                      {
                        key: "rejectUnauthorized",
                        type: "checkbox",
                        defaultValue: true,
                        props: {
                          label: "Ungültige TLS Zertifikate abweisen",
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            wrappers: ["leading"],
            props: {
              leading: "Template",
            },
            fieldGroup: [
              {
                fieldGroupClassName: "ingrid-row",
                fieldGroup: [
                  {
                    key: "from",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    defaultValue: "",
                    props: {
                      label: "Absender",
                      required: true,
                    },
                  },
                  {
                    key: "to",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    defaultValue: "",
                    props: {
                      label: "Empfänger",
                      required: true,
                    },
                  },
                ],
              },
              {
                fieldGroupClassName: "ingrid-row",
                fieldGroup: [
                  {
                    key: "subjectTag",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    defaultValue: "",
                    props: {
                      label: "Betreff-Tag",
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
