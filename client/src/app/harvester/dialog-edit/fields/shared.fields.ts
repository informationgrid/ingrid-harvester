import { FormlyFieldConfig } from "@ngx-formly/core";
import { debounceTime } from "rxjs";
import { map } from "rxjs/operators";
import { IdentifierValidator } from "../../../formly/validators";

export abstract class SharedFields {
  static general(): FormlyFieldConfig[] {
    return [
      {
        wrappers: ["section"],
        props: {
          label: "Allgemeine Einstellungen",
          contextHelpId: "harvester_settings_general",
        },
        fieldGroup: [
          {
            fieldGroupClassName: "ingrid-row",
            fieldGroup: [
              {
                key: "type",
                type: "select",
                wrappers: ["inline-help", "form-field"],
                className: "ingrid-col-10 ingrid-col-md-auto",
                props: {
                  label: "Typ",
                  required: true,
                  contextHelpId: "harvester_field_type",
                },
                expressions: {
                  "props.disabled": "model?.id != -1",
                  "props.options": (field) => {
                    return [
                      { label: "CKAN", value: "CKAN" },
                      { label: "CSW", value: "CSW" },
                      {
                        label: "CSW (CODEDE)",
                        value: "CODEDE-CSW",
                        disabled: field.model?.id == -1,
                      },
                      { label: "DCAT", value: "DCAT" },
                      { label: "DCATAPPLU", value: "DCATAPPLU" },
                      { label: "EXCEL", value: "EXCEL" },
                      { label: "EXCEL (SPARSE)", value: "EXCEL_SPARSE" },
                      { label: "JSON", value: "JSON" },
                      { label: "KLD", value: "KLD" },
                      { label: "OAI", value: "OAI" },
                      { label: "SPARQL", value: "SPARQL" },
                      { label: "WFS", value: "WFS" },
                      { label: "WFS (FIS)", value: "WFS.FIS" },
                      { label: "WFS (MS)", value: "WFS.MS" },
                      { label: "WFS (XPLAN)", value: "WFS.XPLAN" },
                      { label: "WFS (Syn XPLAN)", value: "WFS.XPLAN.SYN" },
                    ];
                  },
                },
              },
              {
                key: "catalogId",
                type: "autocomplete",
                className: "ingrid-col-10 ingrid-col-md-auto",
                props: {
                  label: "Katalog-Identifier",
                  required: true,
                  placeholder: "Eingeben oder auswählen",
                  contextHelpId: "harvester_field_catalogId",
                },
                expressions: {
                  "props.options": (field) => {
                    return field.options.formState?.catalogs?.pipe(
                      map((catalogs: any[]) =>
                        catalogs.map((catalog) => ({
                          label: catalog.title,
                          value: catalog.identifier,
                        })),
                      ),
                    );
                  },
                },
                validators: {
                  naming: {
                    expression: (control) => IdentifierValidator(control),
                    message: "Die Eingabe ist ungültig.",
                  },
                },
                hooks: {
                  // Synchronize with the iPlugId field if it exists.
                  onInit: (field) => {
                    field.formControl?.valueChanges
                      .pipe(debounceTime(300))
                      .subscribe((value) => {
                        const iPlugId = field.form.get("iPlugId");
                        if (iPlugId) iPlugId.setValue(field.formControl.value);
                      });
                  },
                },
              },
              {
                key: "priority",
                type: "input",
                wrappers: ["inline-help", "form-field"],
                className: "ingrid-col-10 ingrid-col-md-auto",
                props: {
                  label: "Priorität",
                  type: "number",
                  contextHelpId: "harvester_field_priority",
                },
              },
            ],
          },
          {
            key: "description",
            type: "input",
            wrappers: ["inline-help", "form-field"],
            props: {
              label: "Beschreibung",
              type: "text",
              required: true,
              contextHelpId: "harvester_field_description",
            },
          },
          {
            fieldGroupClassName: "ingrid-row",
            fieldGroup: [
              {
                key: "maxRecords",
                type: "input",
                className: "ingrid-col-10 ingrid-col-md-auto",
                props: {
                  label: "Max. Datensätze pro Anfrage",
                  type: "number",
                  min: 1,
                  max: 10000,
                },
              },
              {
                key: "startPosition",
                type: "input",
                className: "ingrid-col-10 ingrid-col-md-auto",
                props: {
                  label: "Start Datensatz",
                  type: "number",
                  min: 0,
                },
              },
            ],
          },
        ],
      },
    ];
  }

  static sharedRules(): FormlyFieldConfig[] {
    return [
      {
        key: "blacklistedIds",
        type: "chip",
        props: {
          label: "Ausgeschlossene IDs",
        },
      },
      {
        key: "whitelistedIds",
        type: "chip",
        props: {
          label: "Nicht auszuschließende IDs",
        },
      },
      {
        key: "rules",
        fieldGroup: [
          {
            fieldGroupClassName: "ingrid-row",
            fieldGroup: [
              {
                key: "containsDocumentsWithData",
                type: "checkbox",
                defaultValue: false,
                className: "ingrid-col-10 ingrid-col-md-4 ingrid-checkbox",
                props: {
                  label: "Muss Daten-Download enthalten",
                },
              },
              {
                key: "containsDocumentsWithDataBlacklist",
                type: "input",
                className: "ingrid-col-10 ingrid-col-md-auto",
                props: {
                  label: "Datenformat ausschließen",
                  placeholder: "rss,doc,...",
                  attributes: {
                    autocomplete: "off",
                  },
                },
                parsers: [(value?: string) => value?.toLowerCase()],
                expressions: {
                  "props.disabled": "!model?.containsDocumentsWithData",
                  "props.required": "model?.containsDocumentsWithData",
                },
              },
            ],
          },
        ],
      },
    ];
  }

  static additional(): FormlyFieldConfig[] {
    return [
      {
        wrappers: ["section"],
        props: {
          label: "Weitere Einstellungen",
          contextHelpId: "harvester_settings_extras",
        },
        fieldGroup: [
          {
            key: "customCode",
            type: "textarea",
            props: {
              label: "Zusätzlicher Mapping-Code",
              rows: 2,
              attributes: {
                class: "!font-monospace",
              },
            },
          },
        ],
      },
    ];
  }
}
