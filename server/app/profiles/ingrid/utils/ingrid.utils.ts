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

import crypto from 'crypto';
import type { ImporterSettings } from 'importer.settings.js';
import type { IngridMetadata } from '../model/index.document.js';
import { Codelist } from './codelist.js';

export function getSortHash(title: string): string {
    return crypto.createHash('sha1').update(title, 'binary').digest('hex')
}

export function hasValue(val) {
    if (typeof val == "undefined") {
        return false;
    } else if (val == null) {
        return false;
    } else if (typeof val == "string" && val == "") {
        return false;
    } else if (typeof val == "object" && Object.keys(val).length === 0) {
        return false;
    } else {
        return true;
    }
}

export function formatDate(date: Date){
    if (!date) {
        return null;
    }
    return date.getFullYear()
        +(date.getMonth()+1).toString().padStart(2, "0")
        +date.getDate().toString().padStart(2, "0")
        +date.getHours().toString().padStart(2, "0")
        +date.getMinutes().toString().padStart(2, "0")
        +date.getSeconds().toString().padStart(2, "0")
        +date.getMilliseconds().toString().padStart(3, "0").substring(0,3);
}

export function transformToIgcDomainId(value, codelistId: string){
    var id = Codelist.getInstance().getId(codelistId, value)
    return id;
}

export function transformGeneric(value, map, defaultValue) {
    return map[value] ?? defaultValue;
}

export function getIngridMetadata(settings: ImporterSettings): IngridMetadata {
    return {
        iPlugId: settings.iPlugId,
        partner: settings.partner?.split(",")?.map(p => p.trim()),
        provider: settings.provider?.split(",")?.map(p => p.trim()),
        organisation: transformToIgcDomainId(settings.provider, "111"),
        datatype: settings.datatype?.split(",")?.map(p => p.trim()) ?? ["default"],
        dataSourceName: settings.dataSourceName,
        boost: settings.boost,
    };
}

export function getContent(resultObj) {
    const values = [];
    const traverse = obj => {
        if (obj == null) {
            return;
        }
        if (typeof obj !== 'object') {
            values.push(obj);
            return;
        }
        Object.values(obj).forEach(traverse);
    };
    traverse(resultObj);
    return values;
}
