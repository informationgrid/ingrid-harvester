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

import type { CkanSettings } from './ckan.settings.js';

export function createQs(settings: CkanSettings): string {
    const parts = [];
    if (settings.filterGroups?.length > 0) {
        parts.push(`groups:(${settings.filterGroups.join(' OR ')})`);
    }
    if (settings.filterTags?.length > 0) {
        parts.push(`tags:(${settings.filterTags.join(' OR ')})`);
    }
    if (settings.additionalSearchFilter) {
        parts.push(settings.additionalSearchFilter);
    }
    let fq = parts.length > 0 ? `+${parts.join('+')}` : '';
    if (settings.whitelistedIds?.length > 0) {
        const whitelist = `id:(${settings.whitelistedIds.join(' OR ')})`;
        fq = fq ? `((${fq}) OR ${whitelist})` : whitelist;
    }
    return fq;
}