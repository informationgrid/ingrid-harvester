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
import {ElasticSearchUtils} from "../utils/elastic.utils";
import {ElasticSettings} from "../utils/elastic.setting";
import {MiscUtils} from "../utils/misc.utils";
import {ConfigService} from "../services/config/ConfigService";
import {ElasticSearchFactory} from "../utils/elastic.factory";
import {ProfileFactory} from "../profiles/profile.factory";

export abstract class Importer {
    protected observer: Observer<ImportLogMessage>;
    protected summary: Summary;
    protected filterUtils: FilterUtils;
    elastic: ElasticSearchUtils;

    protected constructor(settings: ImporterSettings) {
        this.summary = new Summary(settings);
        this.filterUtils = new FilterUtils(settings);

        let elasticsearchSettings: ElasticSettings = MiscUtils.merge(ConfigService.getGeneralSettings(), {includeTimestamp: true, index: settings.index, dryRun: settings.dryRun, addAlias: !settings.disable});
        this.elastic = ElasticSearchFactory.getElasticUtils(elasticsearchSettings, this.summary);
    }

    //run: Observable<ImportLogMessage>;
    run: Observable<ImportLogMessage> = new Observable<ImportLogMessage>(observer => {
        this.observer = observer;
        this.exec(observer);
    });

    abstract exec(observer: Observer<ImportLogMessage>): Promise<void>;

    getSummary(): Summary {
        return this.summary;
    }
}
