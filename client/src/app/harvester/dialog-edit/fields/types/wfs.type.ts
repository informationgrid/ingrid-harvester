import { FormlyFieldConfig } from "@ngx-formly/core";
import { SharedFields } from "../shared.fields";

export abstract class WfsType {
  static fields(): FormlyFieldConfig[] {
    return [
      {
        expressions: {
          hide: "!model.type?.startsWith('WFS')",
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
            ],
          },
          {
            expressions: {
              hide: "model.profile != 'diplanung'",
            },
            wrappers: ["section"],
            props: {
              label: "Weitere WFS Einstellungen",
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
                fieldGroupClassName: "ingrid-row",
                fieldGroup: [
                  {
                    key: "contactMetadata",
                    type: "textarea",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label:
                        "Kontakt-Metadaten Fallback (JSON-Objekt `Contact`)",
                      rows: 6,
                    },
                  },
                  {
                    key: "maintainer",
                    type: "textarea",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: "Maintainer Fallback (JSON-Objekt `Agent`)",
                      rows: 6,
                    },
                  },
                ],
              },
            ],
          },
          {
            expressions: {
              hide: "model.profile != 'zdm'",
            },
            wrappers: ["section"],
            props: {
              label: "Weitere WFS Einstellungen",
            },
            fieldGroup: [
              {
                fieldGroupClassName: "ingrid-row",
                fieldGroup: [
                  {
                    key: "featureLimit",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: "Feature-Limit",
                    },
                  },
                  {
                    key: "maxConcurrent",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
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
    ];
  }
}
