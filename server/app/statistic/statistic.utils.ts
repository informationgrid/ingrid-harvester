/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
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

import { elasticsearchMapping} from './statistic.mapping';
import { ElasticSearchFactory } from '../utils/elastic.factory';
import { ElasticSearchUtils } from '../utils/elastic.utils';
import { ElasticSettings } from 'utils/elastic.setting';
import { ImportLogMessage} from '../model/import.result';
import { MiscUtils } from '../utils/misc.utils';
import { ProfileFactoryLoader } from '../profiles/profile.factory.loader';
import { Summary} from '../model/summary';

const log = require('log4js').getLogger(__filename);

export class StatisticUtils {

    private elasticUtils: ElasticSearchUtils;
    private elasticsearchSettings: ElasticSettings;
    private static maxBulkSize = 100;

    constructor(settings) {
        settings = {
            ...settings,
            index: 'mcloud_harvester_statistic'
        };
        // @ts-ignore
        const summary: Summary = {};
        this.elasticUtils = ElasticSearchFactory.getElasticUtils(settings, summary);
        this.elasticsearchSettings = ProfileFactoryLoader.get().getElasticSettings();
    }

    async saveSummary(logMessage: ImportLogMessage, baseIndex: string) {
        let timestamp = new Date();

        let errors = new Map();
        this.collectErrorsOrWarnings(errors, logMessage.summary.appErrors);
        this.collectErrorsOrWarnings(errors, logMessage.summary.elasticErrors);

        let warnings = new Map();
        this.collectErrorsOrWarnings(warnings, logMessage.summary.warnings.map(entry => entry[1]?entry[0]+": "+entry[1]:entry[0]));

        this.elasticUtils.addDocToBulk({
                timestamp: timestamp,
                base_index: baseIndex,
                numRecords: logMessage.summary.numDocs,
                numSkipped: logMessage.summary.skippedDocs.length,
                numWarnings: logMessage.summary.warnings.length,
                numRecordErrors: logMessage.summary.numErrors,
                numAppErrors: logMessage.summary.appErrors.length,
                numESErrors: logMessage.summary.elasticErrors.length,
                duration: logMessage.duration,
                warnings: Array.from(warnings.entries()).map(entry => ({ message: entry[0], count: entry[1] })),
                errors: Array.from(errors.entries()).map(entry => ({ message: entry[0], count: entry[1] }))
        }, baseIndex+"_"+timestamp.toISOString(), StatisticUtils.maxBulkSize);

        try {
            await this.elasticUtils.prepareIndex(elasticsearchMapping, this.elasticsearchSettings, true);
            await this.elasticUtils.finishIndex(false);
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
