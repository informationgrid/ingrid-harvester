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

export function parseTrustProxy(value: string | undefined): boolean | number | string[] {
    const setting = value?.trim();
    if (!setting || setting.toLowerCase() === 'false') {
        return false;
    }
    if (setting.toLowerCase() === 'true') {
        return true;
    }
    if (/^\d+$/.test(setting)) {
        const hops = Number(setting);
        if (!Number.isSafeInteger(hops)) {
            throw new Error('Invalid TRUST_PROXY hop count');
        }
        return hops;
    }

    const addresses = setting.split(',').map(address => address.trim());
    if (addresses.some(address => !address)) {
        throw new Error('Invalid TRUST_PROXY address list');
    }
    return addresses;
}