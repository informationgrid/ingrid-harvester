import { FormlyFieldConfig } from "@ngx-formly/core";
import { SharedFields } from "../shared.fields";

export abstract class CswType {
  static fields(): FormlyFieldConfig[] {
    return [
      {
        expressions: {
          hide: "model.type != 'CSW'",
        },
        fieldGroup: [
          {
            wrappers: ["section"],
            props: {
              label: "CSW Einstellungen",
            },
            fieldGroup: [
              {
                fieldGroupClassName: "ingrid-row",
                fieldGroup: [
                  {
                    key: "httpMethod",
                    type: "select",
                    className: "ingrid-col-10 ingrid-col-md-2",
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
                    className: "ingrid-col-10 ingrid-col-md-8",
                    props: {
                      label: "GetCapabilities URL",
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
                    key: "harvestingMode",
                    type: "select",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    defaultValue: "standard",
                    props: {
                      label: "Harvesting Modus",
                      required: true,
                      options: [
                        { label: "Standard", value: "standard" },
                        { label: "Separat (langsam)", value: "separate" },
                      ],
                    },
                  },
                  {
                    key: "maxServices",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    defaultValue: 30,
                    props: {
                      label: "Max. Dienste pro Anfrage",
                      type: "number",
                      required: true,
                      min: 1,
                    },
                    expressions: {
                      hide: "model.harvestingMode != 'separate'",
                    },
                  },
                ],
              },
              {
                fieldGroupClassName: "ingrid-row",
                fieldGroup: [
                  {
                    key: "maxRecords",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    defaultValue: 200,
                    props: {
                      label: "Max. Datensätze pro Anfrage",
                      type: "number",
                      min: 1,
                      max: 10000,
                      required: true,
                    },
                  },
                  {
                    key: "startPosition",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    defaultValue: 1,
                    props: {
                      label: "Start Datensatz",
                      type: "number",
                      min: 0,
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
              {
                expressions: {
                  hide: (field) => {
                    return field.options?.formState?.profile != "diplanung";
                  },
                },
                fieldGroupClassName: "ingrid-row",
                fieldGroup: [
                  {
                    key: "resolveOgcDistributions",
                    type: "select",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    defaultValue: false,
                    props: {
                      label: "WFS/WMS auflösen",
                      required: true,
                      options: [
                        { label: "Nein", value: false },
                        { label: "Ja (langsam)", value: true },
                      ],
                    },
                  },
                  {
                    key: "simplifyTolerance",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    defaultValue: 0,
                    props: {
                      label: "Toleranz: Polygone vereinfachen",
                      type: "number",
                      required: true,
                      min: 0,
                    },
                  },
                  {
                    key: "pluPlanState",
                    type: "select",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: "Planstatus",
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
                ],
              },
            ],
          },
          {
            wrappers: ["section"],
            props: {
              label: "Filter und Regeln",
            },
            fieldGroup: [
              ...SharedFields.sharedRules(),
              {
                key: "recordFilter",
                type: "textarea",
                props: {
                  label: "Record Filter",
                  rows: 6,
                  attributes: {
                    class: "!font-monospace",
                  },
                },
              },
              {
                key: "eitherKeywords",
                type: "chip",
                props: {
                  label: "Either keywords",
                },
              },
            ],
          },
        ],
      },
    ];
  }
}
