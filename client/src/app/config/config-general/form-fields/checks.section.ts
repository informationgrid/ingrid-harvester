import { FormlyFieldConfig } from "@ngx-formly/core";
import { translateCronExpression } from "../../../utils/cronUtils";
import { isValidCron } from "cron-validator";

export default abstract class ChecksSection {
  static fields(): FormlyFieldConfig[] {
    const getCronSubLabel = (field: FormlyFieldConfig) => {
      if (!field.model.active) return "Planung ausgeschaltet";
      return translateCronExpression(field.form.value.pattern);
    };

    return [
      {
        wrappers: ["block", "section"],
        props: {
          label: "Checks",
          contextHelpId: "config_checks",
          noDivider: true,
        },
        fieldGroup: [
          {
            key: "urlCheck",
            className: "block mb-4",
            fieldGroup: [
              {
                key: "active",
                type: "toggle",
                defaultValue: false,
                props: {
                  label: "Url Check",
                },
                expressions: {
                  "props.subLabel": getCronSubLabel,
                },
              },
              {
                key: "pattern",
                type: "input",
                wrappers: ["form-field", "inline-help"],
                defaultValue: "",
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
            ],
          },
          {
            key: "indexCheck",
            fieldGroup: [
              {
                key: "active",
                type: "toggle",
                defaultValue: false,
                props: {
                  label: "Index Check",
                },
                expressions: {
                  "props.subLabel": getCronSubLabel,
                },
              },
              {
                key: "pattern",
                type: "input",
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
            ],
          },
        ],
      },
    ];
  }
}
