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

import { ElasticQueries } from './elastic.queries';
import { ElasticsearchUtils } from './elastic.utils';
import { ProfileFactoryLoader } from '../profiles/profile.factory.loader';
import { Summary } from '../model/summary';

const log = require('log4js').getLogger(__filename);

export abstract class DeduplicateUtils {

    protected elastic: ElasticsearchUtils;
    protected queries: ElasticQueries;
    protected summary: Summary;

    constructor(elasticUtils: ElasticsearchUtils, summary: Summary) {
        this.elastic = elasticUtils;
        this.summary = summary;
        this.queries = ProfileFactoryLoader.get().getElasticQueries();
    }

    abstract deduplicate(): Promise<void>;

    abstract _deduplicateByTitle(): Promise<void>;

    protected handleError(message: string, error: any): void {
        this.summary.elasticErrors.push(message);
        log.error(message, error);
    }
}
