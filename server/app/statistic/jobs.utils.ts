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


/**
 * Total number of errors of a job. The record errors (numErrors) of the catalog stages (`catalog/<id>`) are
 * already summed up in the main summary (Importer.addCatalogStageResults()), so only their errors[] are added.
 */
export function totalNumErrors(globalSummary: Summary, stageSummaries: Summary[] = []): number {
    const count = (s: Summary, withNumErrors: boolean) => (withNumErrors ? (s?.numErrors ?? 0) : 0) + (s?.errors?.length ?? 0);
    return count(globalSummary, true)
        + stageSummaries.reduce((sum, s) => sum + count(s, !s?.stage?.startsWith('catalog/')), 0);
}

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
        const status = logMessage.status;
        const stages = allStages.map(s => ({
            name: s.stage,
            startTime: s.startTime,
            numDocs: s.numDocs,
            numErrors: s.numErrors + (s.errors?.length ?? 0),
            numSkipped: s.skippedDocs?.length ?? 0,
            errors: s.errors ?? [],
            warnings: s.warnings?.map(w => w.join(' ')) ?? [],
            skippedDocs: s.skippedDocs ?? [],
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
                numErrors: totalNumErrors(globalSummary, stageSummaries),
                stages,
            }, logMessage.jobId, 1);
            await this.elasticUtils.finishIndex();
        }
        catch (err) {
            log.error('Error occurred saving job to harvester_jobs index', err);
        }
    }

}
