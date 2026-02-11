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

import { CswImporter } from '../../../importer/csw/csw.importer.js';
import type { CswSettings } from '../../../importer/csw/csw.settings.js';
import { ConfigService } from '../../../services/config/ConfigService.js';
import { INGRID_META_INDEX } from '../profile.factory.js';

export class IngridCswImporter extends CswImporter {

    constructor(settings: CswSettings) {
        super(settings);
    }

    protected async postHarvestingHandling() {
        let meta = await this.elastic.search(INGRID_META_INDEX,
            {
                "query": {
                    "term": {
                        "plugId": {
                            "value": this.getSettings().iPlugId,
                        }
                    }
                }
            }, false);
        if (meta.hits?.total?.value > 0) {
            let entry = meta.hits?.hits[0]._source;

            entry.lastIndexed = new Date(Date.now()).toISOString();
            entry.plugdescription.dataSourceName = this.getSettings().dataSourceName;
            entry.plugdescription.provider = this.getSettings().provider?.split(",")?.map(p => p.trim());
            entry.plugdescription.dataType = this.getSettings().datatype?.split(",")?.map(d => d.trim());
            entry.plugdescription.partner = this.getSettings().partner?.split(",")?.map(p => p.trim());

            await this.elastic.update(INGRID_META_INDEX, meta.hits?.hits[0]._id, entry, false);
        }
        else {
            let { prefix, index } = ConfigService.getGeneralSettings().elasticsearch;
            let indexId = (prefix ?? '') + this.getSettings().catalogId;
            let entry = {
                "plugId": this.getSettings().iPlugId,
                "indexId": indexId,
                "iPlugName": "Harvester",
                "lastIndexed": new Date(Date.now()).toISOString(),
                "linkedIndex": indexId,
                "plugdescription": {
                    "dataSourceName": this.getSettings().dataSourceName,
                    "provider": this.getSettings().provider?.split(",")?.map(p => p.trim()),
                    "dataType": this.getSettings().datatype?.split(",")?.map(d => d.trim()),
                    "partner": this.getSettings().partner?.split(",")?.map(p => p.trim()),
                    "ranking": [
                        "score"
                    ],
                    "iPlugClass": "de.ingrid.iplug.csw.dsc.CswDscSearchPlug",
                    "fields": [],
                    "proxyServiceUrl": this.getSettings().iPlugId,
                    "useRemoteElasticsearch": true
                },
                "active": false
            }
            await this.elastic.index(INGRID_META_INDEX, entry, false);
        }
    }
}
