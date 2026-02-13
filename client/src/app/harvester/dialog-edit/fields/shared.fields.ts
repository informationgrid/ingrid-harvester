import { FormlyFieldConfig } from "@ngx-formly/core";
import { debounceTime, Observable } from "rxjs";
import { Catalog } from "../../../../../../server/app/model/dcatApPlu.model";
import { map } from "rxjs/operators";
import { identifierValidator } from "../../../formly/validators";

export abstract class SharedFields {
  static addGeneral(options: {
    catalogs: Observable<Catalog[]>;
    datasourceId?: number;
  }): FormlyFieldConfig[] {
    return [
      {
        wrappers: ["section"],
        props: { label: "Allgemein" },
        fieldGroup: [
          {
            fieldGroupClassName: "ingrid-row",
            fieldGroup: [
              {
                key: "type",
                type: "select",
                className: "ingrid-col-10 ingrid-col-md-auto",
                props: {
                  label: "Typ",
                  required: true,
                  options: [
                    { label: "CKAN", value: "CKAN" },
                    { label: "CSW", value: "CSW" },
                    {
                      label: "CODEDE-CSW",
                      value: "CODEDE-CSW",
                      disabled: options?.datasourceId == -1,
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
                  ],
                },
              },
              {
                key: "catalogId",
                type: "autocomplete",
                className: "ingrid-col-10 ingrid-col-md-auto",
                props: {
                  label: "Katalog-Identifier",
                  options: options.catalogs.pipe(
                    map((catalogs) =>
                      catalogs.map((catalog) => ({
                        label: catalog.title,
                        value: catalog.identifier,
                      })),
                    ),
                  ),
                  required: true,
                  placeholder: "Eingeben oder auswählen",
                },
                validators: {
                  naming: {
                    expression: (control) => identifierValidator(control),
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
                className: "ingrid-col-10 ingrid-col-md-auto",
                props: {
                  label: "Priorität",
                  type: "number",
                },
              },
            ],
          },
          {
            key: "description",
            type: "input",
            props: {
              label: "Beschreibung",
              type: "text",
              required: true,
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

  static addRules(): FormlyFieldConfig[] {
    return [
      {
        fieldGroup: [
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
        ],
      },
    ];
  }
}
