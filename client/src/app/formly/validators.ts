/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2024 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or - as soon they will be
 * approved by the European Commission - subsequent versions of the
 * EUPL (the "Licence");
 *
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the Licence is distributed on an "AS IS" basis,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and
 * limitations under the Licence.
 * ==================================================
 */

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
  } catch (error) {
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

export function JsonValidator(control: AbstractControl): ValidationErrors {
  try {
    if (!control.value?.trim()) return null;
    JSON.parse(control.value);
    return null;
  } catch (error) {
    return { json: true };
  }
}

export function JsonKeysValidator(
  control: AbstractControl,
  options: { keys: string[]; atLeastOne?: boolean },
): boolean {
  try {
    const json = JSON.parse(control.value);

    let matchCount = 0;
    for (const key of options.keys) {
      if (json.hasOwnProperty(key)) matchCount++;
    }

    if (options.atLeastOne) {
      return matchCount > 0;
    } else {
      return matchCount === options.keys.length;
    }
  } catch (error) {
    return false;
  }
}
