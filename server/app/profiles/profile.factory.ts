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

import { BaseMapper } from '../importer/base.mapper';
import { ElasticsearchUtils } from '../persistence/elastic.utils';
import { ElasticQueries } from '../persistence/elastic.queries';
import { ImporterFactory } from '../importer/importer.factory';
import { IndexDocument } from '../model/index.document';
import { IndexDocumentFactory } from '../model/index.document.factory';
import { IndexSettings } from '../persistence/elastic.setting';
import { PostgresAggregator } from '../persistence/postgres.aggregator';
import { PostgresQueries } from '../persistence/postgres.queries';

export abstract class ProfileFactory<M extends BaseMapper> {

    /**
     * Set up profile specific environment.
     */
    async configure(elastic: ElasticsearchUtils) {};

    abstract getElasticQueries(): ElasticQueries;
    abstract getImporterFactory(): ImporterFactory;
    abstract getIndexDocumentFactory(mapper: M): IndexDocumentFactory<IndexDocument>;
    abstract getIndexMappings(): any;
    abstract getIndexSettings(): IndexSettings;
    abstract getPostgresAggregator(): PostgresAggregator<IndexDocument>;
    abstract getProfileName(): string;

    getPostgresQueries(): PostgresQueries {
        return PostgresQueries.getInstance();
    }
}
