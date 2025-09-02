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

import { getLogger } from 'log4js';
import { BaseMapper } from '../importer/base.mapper.js';
import { ImporterFactory } from '../importer/importer.factory.js';
import { Catalog } from '../model/dcatApPlu.model.js';
import { IndexDocument } from '../model/index.document.js';
import { IndexDocumentFactory } from '../model/index.document.factory.js';
import { DatabaseFactory } from '../persistence/database.factory.js';
import { DatabaseUtils } from '../persistence/database.utils.js';
import { ElasticsearchFactory } from '../persistence/elastic.factory.js';
import { ElasticQueries } from '../persistence/elastic.queries.js';
import { IndexSettings } from '../persistence/elastic.setting.js';
import { ElasticsearchUtils } from '../persistence/elastic.utils.js';
import { PostgresAggregator } from '../persistence/postgres.aggregator.js';
import { PostgresQueries } from '../persistence/postgres.queries.js';
import { ConfigService } from '../services/config/ConfigService.js';
import * as MiscUtils from '../utils/misc.utils.js';

const log = getLogger(import.meta.filename);

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

    async createCatalogIfNotExist(catalog: string | Catalog, database?: DatabaseUtils, elastic?: ElasticsearchUtils): Promise<Catalog> {
        const { database: dbConfig, elasticsearch: esConfig } = ConfigService.getGeneralSettings();
        database ??= DatabaseFactory.getDatabaseUtils(dbConfig, null);
        elastic ??= ElasticsearchFactory.getElasticUtils(esConfig, null);

        if (typeof(catalog) == 'string') {
            catalog = {
                description: `${catalog} (automatically created)`,
                identifier: catalog,
                publisher: undefined,
                title: `${catalog} (automatically created)`
            };
        }
        log.info(`Ensuring existence of DB entry for catalog "${catalog.identifier}"`);
        return await database.createCatalog(catalog);
    }

    dateReplacer = MiscUtils.dateReplacer;

    getIndexMappings(): any {
        return require(`./${this.getProfileName()}/persistence/elastic.mappings.json`);
    }

    getIndexSettings(): IndexSettings {
        return require(`./${this.getProfileName()}/persistence/elastic.settings.json`);
    }

    getPostgresQueries(): PostgresQueries {
        return PostgresQueries.getInstance();
    }

    abstract getElasticQueries(): ElasticQueries;
    abstract getImporterFactory(): ImporterFactory;
    abstract getIndexDocumentFactory(mapper: M): IndexDocumentFactory<IndexDocument>;
    abstract getPostgresAggregator(): PostgresAggregator<IndexDocument>;
    abstract getProfileName(): string;
    abstract useIndexPerCatalog(): boolean;
}
