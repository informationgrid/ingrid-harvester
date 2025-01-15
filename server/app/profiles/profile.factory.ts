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
import { ImporterFactory } from '../importer/importer.factory';
import { IndexDocument } from '../model/index.document';
import { IndexDocumentFactory } from '../model/index.document.factory';
import { DatabaseFactory } from '../persistence/database.factory';
import { DatabaseUtils } from '../persistence/database.utils';
import { ElasticsearchFactory } from '../persistence/elastic.factory';
import { ElasticQueries } from '../persistence/elastic.queries';
import { IndexSettings } from '../persistence/elastic.setting';
import { ElasticsearchUtils } from '../persistence/elastic.utils';
import { PostgresAggregator } from '../persistence/postgres.aggregator';
import { PostgresQueries } from '../persistence/postgres.queries';
import { ConfigService } from '../services/config/ConfigService';

export abstract class ProfileFactory<M extends BaseMapper> {

    /**
     * Set up profile specific environment.
     */
    async init(): Promise<{ database: DatabaseUtils, elastic: ElasticsearchUtils }> {
        const { database: dbConfig, elasticsearch: esConfig } = ConfigService.getGeneralSettings();
        let database = DatabaseFactory.getDatabaseUtils(dbConfig, null);
        let elastic = ElasticsearchFactory.getElasticUtils(esConfig, null);

        // try to initialize the ES index if it does not exist
        await elastic.prepareIndex(this.getIndexMappings(), this.getIndexSettings(), true);
        await elastic.addAlias(esConfig.prefix + esConfig.index, esConfig.alias);

        // try to initialize the DB tables if they do not exist
        await database.init();

        return { database, elastic };
    };

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
