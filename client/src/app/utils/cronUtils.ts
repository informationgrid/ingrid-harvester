import cronstrue from "cronstrue/i18n";
import { isValidCron } from "cron-validator";

export function translateCronExpression(expression: string): string {
  if (!isValidCron(expression)) return "Kein gültiger Cron-Ausdruck";
  return cronstrue.toString(expression, { locale: "de" });
}
