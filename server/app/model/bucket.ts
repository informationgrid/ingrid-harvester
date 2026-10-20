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

import type { Distribution } from "./distribution.js"

/**
 * Contains a main document, a list of secondary documents, and a list of services operating on the main document.
 * The main document herein is still unspecified and needs to be determined by catalog-specific prioritization rules.
 */
export interface Bucket<T> {
    anchor_id: string | number,
    documents: Map<string | number, T>,
    operatingServices: Map<string | number, Distribution>
}

/**
 * Prioritized Bucket, after determining which is the main document
 * and which are secondary documents that hold additional information.
 */
export interface PrioritizedBucket<T> {
    mainDocument: T,
    documents: Map<string | number, T>
}
