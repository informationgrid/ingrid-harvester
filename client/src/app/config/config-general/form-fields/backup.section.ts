import { FormlyFieldConfig } from "@ngx-formly/core";
import { translateCronExpression } from "../../../utils/cronUtils";
import { isValidCron } from "cron-validator";

export default abstract class BackupSection {
  static fields(): FormlyFieldConfig[] {
    return [
      {
        key: "indexBackup",
        wrappers: ["block", "section"],
        props: {
          label: "Index-Backup",
          contextHelpId: "config_index_backup",
          noDivider: true,
        },
        fieldGroup: [
          {
            key: "active",
            type: "toggle",
            defaultValue: false,
            props: {
              label: "Index-Backup",
            },
            expressions: {
              "props.subLabel": (field: FormlyFieldConfig) => {
                if (!field.model.active) return "Planung ausgeschaltet";
                return translateCronExpression(field.form.value.cronPattern);
              },
            },
          },
          {
            key: "cronPattern",
            type: "input",
            className: "block mb-4",
            wrappers: ["form-field", "inline-help"],
            props: {
              label: "Cron Expression",
              placeholder: "* * * * *",
              description:
                "Syntax: Minute | Stunde | Tag(Monat) | Monat | Wochentag",
              contextHelpId: "config_cron",
            },
            expressions: {
              "props.required": "model.active",
            },
            validators: {
              validation: ["cron"],
            },
          },
          {
            key: "indexPattern",
            type: "input",
            props: {
              label: "Index (RegExp)",
            },
          },
          {
            key: "dir",
            type: "input",
            props: {
              label: "Verzeichnis",
            },
            expressions: {
              "props.required": (field: FormlyFieldConfig) => {
                return field.form.value.active;
              },
            },
          },
        ],
      },
    ];
  }
}
