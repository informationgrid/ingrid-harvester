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

import { Catalog } from '../../model/dcatApPlu.model';
import { ConfigService } from '../../services/config/ConfigService';
import { DatabaseFactory } from '../../persistence/database.factory';
import { DatabaseUtils } from '../../persistence/database.utils';
import { ElasticQueries as AbstractElasticQueries } from '../../persistence/elastic.queries';
import { ElasticQueries } from './persistence/elastic.queries';
import { ElasticsearchFactory } from '../../persistence/elastic.factory';
import { ElasticsearchUtils } from '../../persistence/elastic.utils';
import { ImporterFactory } from '../../importer/importer.factory';
import { IndexDocumentFactory } from '../../model/index.document.factory';
import { INGRID_META_INDEX } from '../../profiles/ingrid/profile.factory';
import { PostgresAggregator } from './persistence/postgres.aggregator';
import { PostgresAggregator as AbstractPostgresAggregator} from '../../persistence/postgres.aggregator';
import { ProfileFactory } from '../profile.factory';
import { WfsMapper } from '../../importer/wfs/wfs.mapper';
import { ZdmImporterFactory } from './importer/zdm.importer.factory';
import { ZdmIndexDocument } from './model/index.document';
import { ZdmWfsMapper } from './mapper/zdm.wfs.mapper';

const log = require('log4js').getLogger(__filename);

export class ZdmFactory extends ProfileFactory<WfsMapper> {

    // async init(): Promise<{ database: DatabaseUtils, elastic: ElasticsearchUtils }> {
    //     const { database, elastic } = await super.init();

    //     // create collections/catalogs and indices that occur in the configured harvesters, if they not already exist
    //     const catalogIdentifiers = new Set(ConfigService.get().map(harvester => harvester.catalogId));
    //     for (let identifier of catalogIdentifiers) {
    //         await this.createCatalogIfNotExist(identifier, database, elastic);
    //     }

    //     // create ingrid_meta index
    //     let isIngridMeta = await elastic.isIndexPresent(INGRID_META_INDEX);
    //     if (!isIngridMeta) {
    //         const mappings = require('./persistence/ingrid-meta-mapping.json');
    //         const settings = require('./persistence/ingrid-meta-settings.json');
    //         await elastic.prepareIndexWithName(INGRID_META_INDEX, mappings, settings);
    //     }
    //     return null;
    // }

    // async createCatalogIfNotExist(catalog: string | Catalog, database?: DatabaseUtils, elastic?: ElasticsearchUtils): Promise<Catalog> {
    //     const { database: dbConfig, elasticsearch: esConfig } = ConfigService.getGeneralSettings();
    //     database ??= DatabaseFactory.getDatabaseUtils(dbConfig, null);
    //     elastic ??= ElasticsearchFactory.getElasticUtils(esConfig, null);

    //     if (typeof(catalog) == 'string') {
    //         catalog = {
    //             description: `${catalog} (automatically created)`,
    //             identifier: catalog,
    //             publisher: undefined,
    //             title: `${catalog} (automatically created)`
    //         };
    //     }
    //     log.info(`Ensuring existence of DB entry for catalog "${catalog.identifier}"`);
    //     let catalogPromise = await database.createCatalog(catalog);
    //     log.info(`Ensuring existence of index for catalog "${catalog.identifier}"`);
    //     if (!await elastic.isIndexPresent(catalog.identifier)) {
    //         await elastic.prepareIndexWithName(catalog.identifier, this.getIndexMappings(), this.getIndexSettings());
    //         await elastic.addAlias(catalog.identifier, esConfig.alias);
    //     }
    //     return catalogPromise;
    // }

    getElasticQueries(): AbstractElasticQueries {
        return ElasticQueries.getInstance();
    }

    getIndexDocumentFactory(mapper: WfsMapper): IndexDocumentFactory<ZdmIndexDocument> {
        switch (mapper.constructor.name) {
            case 'WfsMapper': return new ZdmWfsMapper(<WfsMapper>mapper);
            default: throw Error(`Mapper type ${mapper.constructor.name} is not supported`);
        }
    }

    getImporterFactory(): ImporterFactory {
        return new ZdmImporterFactory();
    }

    getPostgresAggregator(): AbstractPostgresAggregator<ZdmIndexDocument> {
        return new PostgresAggregator();
    }

    getProfileName(): string {
        return 'zdm';
    }

    useIndexPerCatalog(): boolean {
        return false;
    }
}
