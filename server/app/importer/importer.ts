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

import { ConfigService } from '../services/config/ConfigService';
import { DatabaseFactory } from '../persistence/database.factory';
import { DatabaseUtils } from '../persistence/database.utils';
import { ElasticsearchFactory } from '../persistence/elastic.factory';
import { ElasticsearchUtils } from '../persistence/elastic.utils';
import { FilterUtils } from '../utils/filter.utils';
import { ImporterSettings } from '../importer.settings';
import { ImportLogMessage } from '../model/import.result';
import { IndexConfiguration } from '../persistence/elastic.setting';
import { Observable, Observer } from 'rxjs';
import { Summary } from '../model/summary';

export abstract class Importer {

    protected observer: Observer<ImportLogMessage>;
    protected summary: Summary;
    protected filterUtils: FilterUtils;
    database: DatabaseUtils;
    elastic: ElasticsearchUtils;

    protected constructor(settings: ImporterSettings) {
        this.summary = new Summary(settings);
        this.filterUtils = new FilterUtils(settings);

        let generalConfig = ConfigService.getGeneralSettings();
        let elasticsearchConfig: IndexConfiguration = {
            ...generalConfig.elasticsearch,
            includeTimestamp: true,
            dryRun: settings.dryRun,
            addAlias: !settings.disable
        };
        this.database = DatabaseFactory.getDatabaseUtils(generalConfig.database, this.summary);
        this.elastic = ElasticsearchFactory.getElasticUtils(elasticsearchConfig, this.summary);

        // override harvester-specific setting if the general config param is set
        if (generalConfig.allowAllUnauthorizedSSL) {
            settings.rejectUnauthorizedSSL = false;
        }
    }

    run: Observable<ImportLogMessage> = new Observable<ImportLogMessage>(observer => {
        this.observer = observer;
        this.exec(observer);
    });

    abstract exec(observer: Observer<ImportLogMessage>): Promise<void>;

    getSummary(): Summary {
        return this.summary;
    }
}
