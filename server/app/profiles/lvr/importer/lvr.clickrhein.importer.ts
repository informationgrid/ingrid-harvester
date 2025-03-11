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

import { JsonImporter } from '../../../importer/json/json.importer';
import { JsonMapper } from '../../../importer/json/json.mapper';
import { JsonSettings } from '../../../importer/json/json.settings';
import { RequestDelegate } from '../../../utils/http-request.utils';
import { Summary } from '../../../model/summary';

export class LvrClickRheinImporter extends JsonImporter {

    private categoryMap: Record<string, Record<number, string>> = {};

    constructor(settings: JsonSettings) {
        super(settings);
    }

    getMapper(settings: JsonSettings, record: object, harvestTime: Date, summary: Summary): JsonMapper {
        return new JsonMapper(settings, { ...record, categoryMap: this.categoryMap }, harvestTime, summary);
    }

    protected async preHarvestingHandling() {
        const requestConfig = JsonImporter.createRequestConfig({ ...this.settings, sourceURL: this.settings.additionalSettings['metaURL'] });
        const requestDelegate = new RequestDelegate(requestConfig);
        let response = await requestDelegate.doRequest();
        Object.entries(response).forEach(([category, values]) => {
            this.categoryMap[category] = {};
            for (let entry of (values as any[])) {
                this.categoryMap[category][entry.id] = entry.name;
            }
        });
    }
}
