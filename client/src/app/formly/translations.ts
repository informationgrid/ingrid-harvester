import { TranslocoService } from "@ngneat/transloco";

export function registerTranslateExtension(transloco: TranslocoService) {
  return {
    validationMessages: [
      {
        name: "required",
        message: transloco.translate("form.validationMessages.required"),
      },
      {
        name: "url",
        message: transloco.translate("form.validationMessages.url"),
      },
      {
        name: "email",
        message: transloco.translate("form.validationMessages.email"),
      },
      {
        name: "uniqueKey",
        message: transloco.translate("form.validationMessages.uniqueKey"),
      },
      {
        name: "json",
        message: transloco.translate("form.validationMessages.json"),
      },
      {
        name: "pattern",
        message: transloco.translate("form.validationMessages.pattern"),
      },
      {
        name: "cron",
        message: transloco.translate("form.validationMessages.cron"),
      },
    ],
  };
}
