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

import { isDeepStrictEqual } from 'node:util';

/**
 * Merges Elasticsearch mapping fragments into one mapping. Objects present in several fragments
 * (e.g. a shared `properties` container) are merged recursively; a field definition (an object with a
 * string `type`) or any other value present in several fragments must be identical - one index can
 * only hold one definition per field path. The fragments themselves are not modified.
 */
export function mergeMappings(...fragments: object[]): object {
    return fragments.reduce((merged, fragment) => mergeInto(merged, structuredClone(fragment), ''), {});
}

function mergeInto(target: any, source: any, path: string): any {
    for (const [key, value] of Object.entries(source)) {
        const keyPath = path ? `${path}.${key}` : key;
        if (!(key in target)) {
            target[key] = value;
        }
        else if (isContainer(target[key]) && isContainer(value)) {
            mergeInto(target[key], value, keyPath);
        }
        else if (!isDeepStrictEqual(target[key], value)) {
            throw new Error(`Conflicting mapping definition at "${keyPath}"`);
        }
    }
    return target;
}

// a plain object that is not itself a field definition - note that a `properties` container may hold
// a field *named* "type" (an object), whereas a field definition's `type` is the field type (a string)
function isContainer(value: any): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value) && typeof value.type !== 'string';
}
