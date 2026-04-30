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

import type { GeneralSettings } from '@shared/general-config.settings.js';
import type { JobStatus } from '@shared/job.js';
import log4js from 'log4js';
import type { ImportLogMessage } from '../model/import.result.js';
import type { Summary } from '../model/summary.js';
import { ElasticsearchFactory } from '../persistence/elastic.factory.js';
import type { IndexSettings } from '../persistence/elastic.setting.js';
import type { ElasticsearchUtils } from '../persistence/elastic.utils.js';
import { ProfileFactoryLoader } from '../profiles/profile.factory.loader.js';
import jobsMapping from './jobs.mapping.json' with { type: 'json' };
import { ConfigService } from '../services/config/ConfigService.js';

const log = log4js.getLogger(import.meta.filename);


export class JobsUtils {

    private indexSettings: IndexSettings;

    constructor() {
        this.indexSettings = ProfileFactoryLoader.get().getIndexSettings();
    }
    
    private get elasticUtils(): ElasticsearchUtils {
        const config = {
            ...ConfigService.getGeneralSettings().elasticsearch,
            includeTimestamp: false,
            index: 'harvester_jobs'
        };
        // @ts-ignore
        return ElasticsearchFactory.getElasticUtils(config, { errors: [] });
    }

    async saveJob(logMessage: ImportLogMessage, baseIndex: string, stageSummaries: Summary[] = []): Promise<void> {
        const globalSummary = logMessage.summary;
        const allStages = [logMessage.summary, ...stageSummaries];
        const status = JobsUtils.deriveStatus(logMessage, allStages);
        const stages = allStages.map(s => ({
            name: s.stage,
            startTime: s.startTime,
            numDocs: s.numDocs,
            numErrors: s.numErrors + (s.errors?.length ?? 0),
            numSkipped: s.skippedDocs?.length ?? 0,
            errors: s.errors ?? [],
        }));

        try {
            await this.elasticUtils.prepareIndex(jobsMapping, this.indexSettings, true);
            const finishTime = new Date();
            const duration = globalSummary?.startTime
                ? (finishTime.getTime() - globalSummary.startTime.getTime()) / 1000
                : logMessage.duration;
            await this.elasticUtils.addDocToBulk({
                jobId: logMessage.jobId,
                harvesterId: logMessage.id,
                startTime: globalSummary?.startTime,
                finishTime,
                duration,
                status,
                numDocs: globalSummary?.numDocs ?? 0,
                numSkipped: globalSummary?.skippedDocs?.length ?? 0,
                numErrors: allStages.reduce((sum, s) => sum + (s?.numErrors ?? 0) + (s?.errors?.length ?? 0), 0),
                stages,
            }, logMessage.jobId, 1);
            await this.elasticUtils.finishIndex();
        }
        catch (err) {
            log.error('Error occurred saving job to harvester_jobs index', err);
        }
    }

    static deriveStatus(logMessage: ImportLogMessage, allStages: Summary[]): JobStatus {
        if (logMessage.message === 'Import cancelled') return 'cancelled';
        if (!logMessage.summary) return 'success';
        if (logMessage.message) return 'error';
        if (allStages.some(s => (s?.errors?.length ?? 0) > 0 || (s?.numErrors ?? 0) > 0)) return 'error';
        if (allStages.some(s => (s?.skippedDocs?.length ?? 0) > 0)) return 'partial';
        return 'success';
    }
}
