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

import type { JobEntry } from '@shared/job.js';
import { Service } from '@tsed/di';
import { ElasticsearchFactory } from '../../persistence/elastic.factory.js';
import type { IndexSettings } from '../../persistence/elastic.setting.js';
import type { ElasticsearchUtils } from '../../persistence/elastic.utils.js';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader.js';
import jobsMapping from '../../statistic/jobs.mapping.json' with { type: 'json' };
import { ConfigService } from '../config/ConfigService.js';

@Service()
export class JobsService {

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

    async getJobs(harvesterId: number, limit = 10): Promise<{ harvester: string, jobs: JobEntry[] }> {
        await this.elasticUtils.prepareIndex(jobsMapping, this.indexSettings, true);
        const harvester = ConfigService.getHarvesters().find(h => h.id === harvesterId);
        const { history } = await this.elasticUtils.getHistory({
            query: { term: { harvesterId } },
            sort: { finishTime: { order: 'desc' } },
        }, limit);
        return {
            harvester: harvester?.description ?? String(harvesterId),
            jobs: history,
        };
    }
}
