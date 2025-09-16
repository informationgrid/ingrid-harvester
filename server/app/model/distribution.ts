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

import type { DateRange } from './dateRange.js';

export interface Distribution {
    format?: string[];
    accessURL: string;
    downloadURL?: string;
    id?: string;
    title?: string;
    description?: string;
    issued?: Date;
    modified?: Date;
    byteSize?: number;
    temporal?: DateRange;
    pluDocType?: string;
    mapLayerNames?: string[];
    resolvedGeometry?: string;
    operates_on?: string[];
    isSynthetic?: boolean;
    errors?: string[];
}
