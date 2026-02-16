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
