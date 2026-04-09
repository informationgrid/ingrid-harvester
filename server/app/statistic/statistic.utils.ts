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
import type { ImportLogMessage } from '../model/import.result.js';
import { ElasticsearchFactory } from '../persistence/elastic.factory.js';
import type { IndexSettings } from '../persistence/elastic.setting.js';
import type { ElasticsearchUtils } from '../persistence/elastic.utils.js';
import { ProfileFactoryLoader } from '../profiles/profile.factory.loader.js';
import { ConfigService } from '../services/config/ConfigService.js';
import * as MiscUtils from '../utils/misc.utils.js';
import statisticMapping from './statistic.mapping.json' with { type: 'json' };

const log = log4js.getLogger(import.meta.filename);

export class StatisticUtils {

    private indexSettings: IndexSettings;
    private static maxBulkSize = 100;

    constructor() {
        this.indexSettings = ProfileFactoryLoader.get().getIndexSettings();
    }
    
    private get elasticUtils(): ElasticsearchUtils {
        const config = {
            ...ConfigService.getGeneralSettings().elasticsearch,
            includeTimestamp: false,
            index: 'harvester_statistic'
        };
        // @ts-ignore
        return ElasticsearchFactory.getElasticUtils(config, { errors: [] });
    }

    async saveSummary(logMessage: ImportLogMessage, baseIndex: string) {
        let timestamp = new Date();

        let errors = new Map();
        this.collectErrorsOrWarnings(errors, logMessage.summary.errors.map(e => e.error));

        let warnings = new Map();
        this.collectErrorsOrWarnings(warnings, logMessage.summary.warnings.map(entry => entry[1]?entry[0]+": "+entry[1]:entry[0]));

        this.elasticUtils.addDocToBulk({
                timestamp: timestamp,
                base_index: baseIndex,
                numRecords: logMessage.summary.numDocs,
                numSkipped: logMessage.summary.skippedDocs.length,
                numWarnings: logMessage.summary.warnings.length,
                numRecordErrors: logMessage.summary.numErrors,
                numAppErrors: logMessage.summary.errors.filter(e => e.type === 'app').length,
                numDBErrors: logMessage.summary.errors.filter(e => e.type === 'database').length,
                numESErrors: logMessage.summary.errors.filter(e => e.type === 'elastic').length,
                duration: logMessage.duration,
                warnings: Array.from(warnings.entries()).map(entry => ({ message: entry[0], count: entry[1] })),
                errors: Array.from(errors.entries()).map(entry => ({ message: entry[0], count: entry[1] }))
        }, baseIndex, StatisticUtils.maxBulkSize);

        try {
            await this.elasticUtils.prepareIndex(statisticMapping, this.indexSettings, true);
            await this.elasticUtils.finishIndex();
        }
        catch(err) {
            let message = 'Error occurred creating statistic index';
            log.error(message, err);
        }
    }

    collectErrorsOrWarnings(result: Map<string, number>, messages: string[]) {
        messages.forEach(message => {
            // truncate too long messages:
            // a) because usually the content is not needed for debugging after a few lines
            // b) because elasticsearch complains for too long messages in a document
            let truncatedMessage = MiscUtils.truncateErrorMessage(message);
            if (result.has(truncatedMessage)) {
                result.set(truncatedMessage, result.get(truncatedMessage)+1);
            }
            else {
                result.set(truncatedMessage, 1);
            }
        });
    }
}
