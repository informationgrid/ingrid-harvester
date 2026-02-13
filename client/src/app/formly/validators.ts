import { AbstractControl } from "@angular/forms";

export function identifierValidator(control: AbstractControl): boolean {
  const value: string = control.value;
  return (
    value &&
    /^(?![_-])[^" *+\/\\|?#><: ]+$/.test(value) &&
    value === value.toLowerCase() &&
    value.length <= 255
  );
}
