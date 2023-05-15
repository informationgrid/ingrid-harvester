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

import { DeduplicateUtils } from '../utils/deduplicate.utils';
import { BaseMapper } from '../importer/base.mapper';
import { ElasticQueries } from '../utils/elastic.queries';
import { ElasticSearchUtils } from '../utils/elastic.utils';
import { ImporterFactory } from '../importer/importer.factory';
import { IndexDocument } from '../model/index.document';
import { Summary } from '../model/summary';

export abstract class ProfileFactory<M extends BaseMapper> {

    abstract getDeduplicationUtils(elasticUtils: ElasticSearchUtils, elasticSettings: any, summary: Summary): DeduplicateUtils;
    abstract getElasticMapping(): any;
    abstract getElasticQueries(): ElasticQueries;
    abstract getElasticSettings(): any;
    abstract getImporterFactory(): ImporterFactory;
    abstract getIndexDocument(): IndexDocument<M>;
    abstract getProfileName(): string;

}
