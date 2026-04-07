import { FormlyFieldConfig } from "@ngx-formly/core";
import { Catalog } from "@shared/catalog";
import { inject } from "@angular/core";
import { TranslocoService } from "@ngneat/transloco";

export abstract class SharedFields {
  static general(): FormlyFieldConfig[] {
    const transloco = inject(TranslocoService);

    return [
      {
        wrappers: ["section"],
        props: {
          label: "Allgemeine Einstellungen",
          contextHelpId: "harvester_settings_general",
        },
        fieldGroup: [
          {
            key: "description",
            type: "input",
            wrappers: ["inline-help", "form-field"],
            props: {
              label: "Name",
              type: "text",
              required: true,
              contextHelpId: "harvester_field_description",
            },
          },
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
                    let supportedTypes = field.options.formState?.importerTypes;
                    if (!supportedTypes) return [];

                    // Filter out the types that are not supported by the current profile.
                    supportedTypes = Object.keys(supportedTypes);
                    const options = [
                      { label: "CKAN", value: "CKAN" },
                      { label: "CSW", value: "CSW" },
                      { label: "DCAT-AP.de", value: "DCATAPDE" },
                      { label: "DCAT-AP.PLU", value: "DCATAPPLU" },
                      { label: "GENESIS", value: "GENESIS" },
                      { label: "JSON", value: "JSON" },
                      { label: "KLD", value: "KLD" },
                      { label: "OAI", value: "OAI" },
                      { label: "SPARQL", value: "SPARQL" },
                      { label: "WFS", value: "WFS" },
                    ];
                    return options.filter((option) =>
                      supportedTypes.includes(option.value),
                    );
                  },
                },
                hooks: {
                  onInit: (field) => {
                    // Apply default values when the type changes.
                    field.formControl.valueChanges.subscribe((value) => {
                      const defaults =
                        field.options.formState?.importerTypes[value]?.defaults;
                      if (!defaults) return;

                      // Assign default values only if not present in the model.
                      for (const key in defaults) {
                        if (defaults[key] == null) continue;
                        if (field.model[key] != null) continue;
                        field.model[key] = defaults[key];
                      }
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
            key: "catalogIds",
            type: "select",
            wrappers: ["form-field"],
            props: {
              label: "Kataloge",
              required: true,
              multiple: true,
              placeholder: transloco.translate("common.pleaseChoose"),
            },
            expressions: {
              "props.options": (field) => {
                return field.options.formState?.catalogs?.map(
                  (catalog: Catalog) => ({
                    label: catalog.name,
                    value: catalog.id,
                  }),
                );
              },
            },
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
          noDivider: true,
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
