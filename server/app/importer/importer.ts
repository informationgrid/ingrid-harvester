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

import {Observer, Observable} from 'rxjs';
import {ImportLogMessage} from '../model/import.result';
import {Summary} from '../model/summary';
import {ImporterSettings} from '../importer.settings';
import {FilterUtils} from "../utils/filter.utils";
import {ElasticSearchUtils} from "../persistence/elastic.utils";
import {ElasticSettings} from "../persistence/elastic.setting";
import {ConfigService} from "../services/config/ConfigService";
import {ElasticSearchFactory} from "../persistence/elastic.factory";
import { DatabaseFactory } from "../persistence/database.factory";
import { DatabaseUtils } from "../persistence/database.utils";

export abstract class Importer {
    protected observer: Observer<ImportLogMessage>;
    protected summary: Summary;
    protected filterUtils: FilterUtils;
    elastic: ElasticSearchUtils;
    database: DatabaseUtils;

    protected constructor(settings: ImporterSettings) {
        this.summary = new Summary(settings);
        this.filterUtils = new FilterUtils(settings);

        let generalConfiguration = ConfigService.getGeneralSettings();
        let elasticsearchSettings: ElasticSettings = {
            elasticSearchUrl: generalConfiguration.elasticsearch.url,
            elasticSearchVersion: generalConfiguration.elasticsearch.version,
            elasticSearchUser: generalConfiguration.elasticsearch.user,
            elasticSearchPassword: generalConfiguration.elasticsearch.password,
            alias: generalConfiguration.elasticsearch.alias,
            includeTimestamp: true,
            index: settings.index,
            dryRun: settings.dryRun,
            addAlias: !settings.disable
        };
        this.elastic = ElasticSearchFactory.getElasticUtils(elasticsearchSettings, this.summary);
        this.database = DatabaseFactory.getDatabaseUtils(generalConfiguration.database, this.summary);
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
