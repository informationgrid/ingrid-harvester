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

import log4js from 'log4js';
import { BaseMapper } from '../base.mapper.js';
import { ImporterSettings } from '../../importer.settings.js';
import { MetadataSource } from '../../model/index.document.js';
import { JsonSettings } from './json.settings.js';
import { Summary } from '../../model/summary.js';

export class JsonMapper extends BaseMapper {

    log = log4js.getLogger();

    readonly record: object;
    readonly id: string;

    private settings: JsonSettings;
    private harvestTime: Date;
    private summary: Summary;

    constructor(settings: JsonSettings, record: object, harvestTime: Date, summary: Summary) {
        super();
        this.settings = settings;
        this.record = record;
        this.id = record[this.settings.idProperty];
        this.harvestTime = harvestTime;
        this.summary = summary;

        super.init();
    }

    getSettings(): JsonSettings {
        return this.settings;
    }

    getSummary(): Summary {
        return this.summary;
    }

    getMetadataSource(): MetadataSource {
        return {
            source_base: this.settings.sourceURL,
            raw_data_source: this.settings.sourceURL,
            source_type: 'json'
        };
    }

    getHarvestedData(): string {
        return JSON.stringify(this.record);
    }

    getHarvestingDate(): Date {
        return this.harvestTime;
    }

    getGeneratedId(): string {
        return this.id;
    }

    getObject(): object {
        return this.record;
    }
}
