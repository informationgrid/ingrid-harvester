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

import { ConfigService } from '../../../services/config/ConfigService';
import { CswImporter } from '../../../importer/csw/csw.importer';
import { RequestDelegate } from '../../../utils/http-request.utils';

const log = require('log4js').getLogger(__filename);

export class IngridCswImporter extends CswImporter {

    private readonly INGRID_META = 'ingrid_meta';

    constructor(settings, requestDelegate?: RequestDelegate) {
        super(settings, requestDelegate)
    }

    protected async handlePostHarvesting() {
        let meta = await this.elastic.search(this.INGRID_META,
            {
                "query": {
                    "term": {
                        "plugId": {
                            "value": this.settings.iPlugId,
                        }
                    }
                }
            }, false);
        if (meta.hits?.total?.value > 0) {
            let entry = meta.hits?.hits[0]._source;

            entry.lastIndexed = new Date(Date.now()).toISOString();
            entry.plugdescription.dataSourceName = this.settings.dataSourceName;
            entry.plugdescription.provider = this.settings.provider?.split(",");
            entry.plugdescription.dataType = this.settings.datatype?.split(",");
            entry.plugdescription.partner = this.settings.partner?.split(",");

            await this.elastic.update(this.INGRID_META, meta.hits?.hits[0]._id, entry, false);
        }
        else {
            let { prefix, index } = ConfigService.getGeneralSettings().elasticsearch;
            let indexId = (prefix ?? '') + index;
            let entry = {
                "plugId": this.settings.iPlugId,
                "indexId": indexId,
                "iPlugName": "Harvester",
                "lastIndexed": new Date(Date.now()).toISOString(),
                "linkedIndex": indexId,
                "plugdescription": {
                    "dataSourceName": this.settings.dataSourceName,
                    "provider": this.settings.provider?.split(","),
                    "dataType": this.settings.datatype?.split(","),
                    "partner": this.settings.partner?.split(","),
                    "ranking": [
                        "score"
                    ],
                    "iPlugClass": "de.ingrid.iplug.csw.dsc.CswDscSearchPlug",
                    "fields": []
                },
                "active": false
            }
            await this.elastic.index(this.INGRID_META, entry, false);
        }
    }
}
