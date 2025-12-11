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

import type { IngridIndexDocument } from './model/index.document.js';

export function createEsId(document: IngridIndexDocument): string {
    return document.uuid;
}

export async function updateIngridMetaIndex(elastic, settings, iPlugClass) {
    let meta = await elastic.search(INGRID_META_INDEX,
        {
            "query": {
                "term": {
                    "plugId": {
                        "value": settings.iPlugId,
                    }
                }
            }
        }, false);
    if (meta.hits?.total?.value > 0) {
        let entry = meta.hits?.hits[0]._source;

        entry.lastIndexed = new Date(Date.now()).toISOString();
        entry.plugdescription.dataSourceName = settings.dataSourceName;
        entry.plugdescription.provider = settings.provider?.split(",")?.map(p => p.trim());
        entry.plugdescription.dataType = settings.datatype?.split(",")?.map(d => d.trim());
        entry.plugdescription.partner = settings.partner?.split(",")?.map(p => p.trim());

        await elastic.update(INGRID_META_INDEX, meta.hits?.hits[0]._id, entry, false);
    }
    else {
        let { prefix, index } = ConfigService.getGeneralSettings().elasticsearch;
        let indexId = (prefix ?? '') + settings.catalogId;
        let entry = {
            "plugId": settings.iPlugId,
            "indexId": indexId,
            "iPlugName": "Harvester",
            "lastIndexed": new Date(Date.now()).toISOString(),
            "linkedIndex": indexId,
            "plugdescription": {
                "dataSourceName": settings.dataSourceName,
                "provider": settings.provider?.split(",")?.map(p => p.trim()),
                "dataType": settings.datatype?.split(",")?.map(d => d.trim()),
                "partner": settings.partner?.split(",")?.map(p => p.trim()),
                "ranking": [
                    "score"
                ],
                "iPlugClass": iPlugClass,
                "fields": [],
                "proxyServiceUrl": settings.iPlugId,
                "useRemoteElasticsearch": true
            },
            "active": false
        }
        await elastic.index(INGRID_META_INDEX, entry, false);
    }
}
