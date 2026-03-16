import { AbstractControl, ValidationErrors } from "@angular/forms";

export function IdentifierValidator(control: AbstractControl): boolean {
  const value: string = control.value;
  return (
    value &&
    /^(?![_-])[^" *+\/\\|?#><: ]+$/.test(value) &&
    value === value.toLowerCase() &&
    value.length <= 255
  );
}

export function UrlValidator(control: AbstractControl): ValidationErrors {
  try {
    const url = new URL(control.value);
    const isUrl = url.protocol === "http:" || url.protocol === "https:";
    return isUrl ? null : { url: true };
  } catch (_) {
    return { url: true };
  }
}

export function UniqueKeyValidator(control: AbstractControl): ValidationErrors {
  const values: any[] = control.value;
  if (!values || !Array.isArray(values)) {
    return null;
  }

  const keys = values.map((v) => v["key"]?.trim());
  const uniqueKeys = new Set(keys);

  return keys.length !== uniqueKeys.size ? { uniqueKey: true } : null;
}
