import { FormlyFieldConfig } from "@ngx-formly/core";
import { SharedFields } from "../shared.fields";

export abstract class DcatapType {
  static fields(): FormlyFieldConfig[] {
    return [
      {
        expressions: {
          hide: "model.type != 'DCATAP'",
        },
        fieldGroup: [
          {
            wrappers: ["section"],
            props: {
              label: "DCAT-AP Einstellungen",
            },
            fieldGroup: [
              {
                fieldGroupClassName: "ingrid-row",
                fieldGroup: [
                  {
                    key: "sourceURL",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: "Catalog URL",
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
                    key: "createGeometadata",
                    type: "checkbox",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: "Geometadaten statt Opendata erzeugen",
                    },
                  },
                ],
              },
              {
                fieldGroupClassName: "ingrid-row",
                fieldGroup: [
                  {
                    key: "idRegex",
                    type: "input",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: "Regular Expression für die ID-Erzeugung aus dem dct:identifier",
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
                fieldGroupClassName: "ingrid-row",
                fieldGroup: [
                  {
                    key: "filterTags",
                    type: "chip",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: "Filter Tags",
                    },
                  },
                  {
                    key: "filterThemes",
                    type: "chip",
                    className: "ingrid-col-10 ingrid-col-md-auto",
                    props: {
                      label: "Filter Themes",
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
