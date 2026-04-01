import { FormlyFieldConfig } from "@ngx-formly/core";
import { JsonKeysValidator } from "../../../../formly/validators";

export abstract class WfsType {
  static fields(): FormlyFieldConfig[] {
    return [
      {
        expressions: {
          hide: "model.type != 'WFS'",
        },
        fieldGroup: [
          {
            wrappers: ["section"],
            props: {
              label: "WFS Einstellungen",
            },
            fieldGroup: [
              {
                fieldGroupClassName: "ingrid-row",
                fieldGroup: [
                  {
                    key: "httpMethod",
                    type: "select",
                    className: "ingrid-col-10 ingrid-col-md-3",
                    props: {
                      label: "HTTP Methode",
                      required: true,
                      options: [
                        { label: "GET", value: "GET" },
                        { label: "POST", value: "POST" },
                      ],
                    },
                  },
                  {
                    key: "sourceURL",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: "Service URL",
                      required: true,
                    },
                    validators: {
                      validation: ["url"],
                    },
                  },
                ],
              },
              {
                fieldGroupClassName: "ingrid-row",
                fieldGroup: [
                  {
                    key: "version",
                    type: "select",
                    className: "ingrid-col-10 ingrid-col-md-3",
                    props: {
                      label: "WFS Version",
                      required: true,
                      options: [
                        { label: "2.0.0", value: "2.0.0" },
                        { label: "1.1.0", value: "1.1.0" },
                      ],
                    },
                  },
                  {
                    key: "typename",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: "Typnamen",
                      description: "Komma-getrennt, inklusive Namespace",
                    },
                  },
                ],
              },
              {
                fieldGroupClassName: "ingrid-row",
                fieldGroup: [
                  {
                    key: "wfsProfile",
                    type: "select",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    defaultValue: "default",
                    props: {
                      label: "WFS Profil",
                      required: true,
                      options: [
                        { label: "Standard", value: "default" },
                        { label: "pegelonline", value: "pegelonline" },
                        { label: "zdm", value: "zdm" },
                      ],
                    },
                  },
                  {
                    key: "featureTitleAttribute",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: "Titel-Attribut (inkl. Namespace-Prefix)",
                      required: true,
                    },
                    expressions: {
                      hide: "model.wfsProfile != 'default'",
                    },
                  },
                ],
              },
              {
                expressions: {
                  hide: (field) => {
                    return field.options?.formState?.profile != "diplanung";
                  },
                },
                fieldGroup: [
                  {
                    fieldGroupClassName: "ingrid-row",
                    fieldGroup: [
                      {
                        key: "pluPlanState",
                        type: "select",
                        className: "ingrid-col-10 ingrid-col-md-3",
                        props: {
                          label: "Planstatus",
                          required: true,
                          options: [
                            { label: "unbekannt", value: "unknown" },
                            { label: "eingestellt", value: "discontinued" },
                            {
                              label: "ganz aufgehoben",
                              value: "completelyReversed",
                            },
                            { label: "festgestellt", value: "fixed" },
                            { label: "in Aufstellung", value: "inPreparation" },
                            { label: "simuliert", value: "planned" },
                          ],
                        },
                      },
                      {
                        key: "contactCswUrl",
                        type: "input",
                        className: "ingrid-col-10 ingrid-col-md-auto",
                        props: {
                          label: "CSW-URL zu Kontakt-Metadaten",
                        },
                      },
                    ],
                  },
                  {
                    fieldGroup: [
                      {
                        key: "contactMetadata",
                        type: "textarea",
                        props: {
                          label:
                            "Kontakt-Metadaten Fallback (JSON-Objekt `Contact`)",
                          rows: 6,
                        },
                        validators: {
                          validation: ["json"],
                          jsonKeys: {
                            expression: (control) =>
                              JsonKeysValidator(control, { keys: ["fn"] }),
                            message: "Das Attribut 'fn' ist erforderlich.",
                          },
                        },
                      },
                      {
                        key: "maintainer",
                        type: "textarea",
                        props: {
                          label: "Maintainer Fallback (JSON-Objekt `Agent`)",
                          rows: 6,
                        },
                        validators: {
                          validation: ["json"],
                          jsonKeys: {
                            expression: (control) =>
                              JsonKeysValidator(control, {
                                keys: ["name", "organization"],
                                atLeastOne: true,
                              }),
                            message:
                              "Bitte geben Sie mindestens ein 'name' oder 'organization' an.",
                          },
                        },
                      },
                    ],
                  },
                ],
              },
              {
                expressions: {
                  hide: (field) => {
                    const profile = field.options?.formState?.profile;
                    return profile != "ingrid" && profile != "zdm";
                  },
                },
                fieldGroup: [
                  {
                    fieldGroupClassName: "ingrid-row",
                    fieldGroup: [
                      {
                        key: "featureLimit",
                        type: "input",
                        className: "ingrid-col-10 ingrid-col-md-auto",
                        defaultValue: 50,
                        props: {
                          label: "Feature-Limit",
                          type: "number",
                          required: true,
                          min: 1,
                        },
                      },
                      {
                        key: "maxConcurrent",
                        type: "input",
                        className: "ingrid-col-10 ingrid-col-md-auto",
                        defaultValue: 4,
                        props: {
                          label: "Anzahl paralleler Abfragen",
                          type: "number",
                          required: true,
                          min: 1,
                        },
                      },
                    ],
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
