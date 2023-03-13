/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or – as soon they will be
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

import {Distribution} from "./distribution";

export class RuleResult {
    constructor(
        public valid: boolean,
        public skipped: boolean
    ) {
    }
}

export class Rules {

    static containsDocumentsWithData(distributions: Distribution[], blacklistedFormats: string[]): RuleResult {
        const valid = distributions.some(dist => this.isDataDocument(dist, blacklistedFormats));
        if (!valid) {
            return new RuleResult(false, true);
        }
        return new RuleResult(true, false);
    }

    /**
     * A distribution containing at least one format which belongs to non-data is defined
     * as not a data document.
     * @param dist
     * @param blacklistedFormats
     */
    private static isDataDocument(dist: Distribution, blacklistedFormats: string[]) {
        return dist.format.every(format => blacklistedFormats.indexOf(format.toLowerCase()) === -1);
    }
}
