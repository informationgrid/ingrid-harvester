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

import { CswMapper } from '../../importer/csw/csw.mapper';
import { ImporterFactory } from '../../importer/importer.factory';
import { Catalog } from '../../model/dcatApPlu.model';
import { IndexDocumentFactory } from '../../model/index.document.factory';
import { DatabaseFactory } from '../../persistence/database.factory';
import { DatabaseUtils } from '../../persistence/database.utils';
import { ElasticsearchFactory } from '../../persistence/elastic.factory';
import { ElasticQueries as AbstractElasticQueries } from '../../persistence/elastic.queries';
import { IndexSettings } from '../../persistence/elastic.setting';
import { ElasticsearchUtils } from '../../persistence/elastic.utils';
import { PostgresAggregator as AbstractPostgresAggregator } from '../../persistence/postgres.aggregator';
import { ConfigService } from '../../services/config/ConfigService';
import { ProfileFactory } from '../profile.factory';
import { IngridImporterFactory } from './importer/ingrid.importer.factory';
import { ingridCswMapper } from './mapper/ingrid.csw.mapper';
import { IngridIndexDocument } from './model/index.document';
import { indexMappings } from './persistence/elastic.mappings';
import { ElasticQueries } from './persistence/elastic.queries';
import { indexSettings } from './persistence/elastic.settings';
import { PostgresAggregator } from './persistence/postgres.aggregator';

const log = require('log4js').getLogger(__filename);

export class ingridFactory extends ProfileFactory<CswMapper> {

    async init(): Promise<{ database: DatabaseUtils, elastic: ElasticsearchUtils }> {
        const { database, elastic } = await super.init();

        // create collections/catalogs and indices that occur in the configured harvesters, if they not already exist
        const catalogIdentifiers = new Set(ConfigService.get().map(harvester => harvester.catalogId));
        for (let identifier of catalogIdentifiers) {
            await this.createCatalogIfNotExist(identifier, database, elastic);
        }

        // create ingrid_meta index
        const ingridMeta = 'ingrid_meta';
        let isIngridMeta = await elastic.isIndexPresent(ingridMeta);
        if (!isIngridMeta) {
            const mappings = require('./persistence/ingrid-meta-mapping.json');
            const settings = require('./persistence/ingrid-meta-settings.json');
            await elastic.prepareIndexWithName(ingridMeta, mappings, settings);
        }
        return null;
    }

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
        let catalogPromise = await database.createCatalog(catalog);
        log.info(`Ensuring existence of index for catalog "${catalog.identifier}"`);
        if (!await elastic.isIndexPresent(catalog.identifier)) {
            await elastic.prepareIndexWithName(catalog.identifier, this.getIndexMappings(), this.getIndexSettings());
            await elastic.addAlias(catalog.identifier, esConfig.alias);
        }
        return catalogPromise;
    }

    getElasticQueries(): AbstractElasticQueries {
        return ElasticQueries.getInstance();
    }

    getIndexMappings(): any {
        return indexMappings;
    }

    getIndexSettings(): IndexSettings {
        return indexSettings;
    }

    getImporterFactory(): ImporterFactory {
        return new IngridImporterFactory();
    }

    getProfileName(): string {
        return 'ingrid';
    }

    getIndexDocumentFactory(mapper: CswMapper ): IndexDocumentFactory<IngridIndexDocument> {
        switch (mapper.constructor.name) {
            case 'CswMapper': return new ingridCswMapper(<CswMapper>mapper);
        }
    }

    getPostgresAggregator(): AbstractPostgresAggregator<IngridIndexDocument> {
        return new PostgresAggregator();
    }

    useIndexPerCatalog(): boolean {
        return true;
    }
}
