import cronstrue from "cronstrue/i18n";

export function translateCronExpression(expression: string): string {
  try {
    return cronstrue.toString(expression, { locale: "de" });
  } catch (e) {
    return "Kein gültiger Ausdruck";
  }
}
