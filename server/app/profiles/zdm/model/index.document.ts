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

import type { IndexDocument } from '../../../model/index.document.js';

// general: https://github.com/informationgrid/ingrid-iplug-wfs-dsc/blob/master/src/main/resources/mapping/zdm-wfs-1.1.0_to_lucene-igc.js
// idf: https://github.com/informationgrid/ingrid-iplug-wfs-dsc/blob/master/src/main/resources/mapping/zdm-wfs-1.1.0_to_idf.js
export type ZdmIndexDocument = IndexDocument & {
    t01_object: {
        obj_id: string
    },
    title: string,
    summary: string,
    x1: number,
    x2: number,
    y1: number,
    y2: number,
    additional_html_1: string,
    idf: string,
    is_feature_type: boolean,
    typename: string,
    number_of_features?: number,
    [key: string]: any  // remaining properties
}
