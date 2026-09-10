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

import { v5 as uuidv5 } from 'uuid';
import type { IndexDocument } from '../../model/index.document.js';
import type { IngridDeprecatedIndexDocument } from './model/index.document.deprecated.js';
import type { IngridOpendataDeprecatedIndexDocument } from './model/opendataindex.document.deprecated.js';

const UUID_NAMESPACE = 'b5d8aadf-d03f-452a-8d91-3a6a7f3b1203';

// the new shape (and IngridOpendataDeprecatedIndexDocument) always has `id`; only
// IngridDeprecatedIndexDocument (the old flat "ingrid" shape) lacks it and needs `uuid` instead.
export function createEsId(document: IndexDocument | IngridDeprecatedIndexDocument | IngridOpendataDeprecatedIndexDocument): string {
    return 'id' in document ? document.id : document.uuid;
}

export function generateWfsUuid(source_base: string, typename: string, obj_id: string) {
    let uniqueStr = [ensureNoEndSlash(source_base), typename, obj_id].join('/');
    return uuidv5(uniqueStr, UUID_NAMESPACE);
}

export function generateUuid(strings: string[]) {
    let uniqueStr = strings.join('/');
    return uuidv5(uniqueStr, UUID_NAMESPACE);
}

export function ensureNoEndSlash(s: string): string {
    return s.replace(/\/$/g, '');
}
