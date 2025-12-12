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

import log4js from 'log4js';
import type { CswMapper } from '../../importer/csw/csw.mapper.js';
import type { ImporterFactory } from '../../importer/importer.factory.js';
import type { WfsMapper } from '../../importer/wfs/wfs.mapper.js';
import { WfsProfile } from '../../importer/wfs/wfs.settings.js';
import type { Catalog } from '../../model/dcatApPlu.model.js';
import type { IndexDocumentFactory } from '../../model/index.document.factory.js';
import { DatabaseFactory } from '../../persistence/database.factory.js';
import type { DatabaseUtils } from '../../persistence/database.utils.js';
import { ElasticsearchFactory } from '../../persistence/elastic.factory.js';
import type { ElasticQueries as AbstractElasticQueries } from '../../persistence/elastic.queries.js';
import type { ElasticsearchUtils } from '../../persistence/elastic.utils.js';
import type { PostgresAggregator as AbstractPostgresAggregator } from '../../persistence/postgres.aggregator.js';
import { ConfigService } from '../../services/config/ConfigService.js';
import { ProfileFactory } from '../profile.factory.js';
import { IngridImporterFactory } from './importer/ingrid.importer.factory.js';
import { ingridCswMapper } from './mapper/ingrid.csw.mapper.js';
import { PegelonlineWfsMapper } from './mapper/wfs/pegelonline.wfs.mapper.js';
import { ZdmWfsMapper } from './mapper/wfs/zdm.wfs.mapper.js';
import type { IngridIndexDocument } from './model/index.document.js';
import { ElasticQueries } from './persistence/elastic.queries.js';
import mappings from './persistence/ingrid-meta-mapping.json' with { type: 'json' };
import settings from './persistence/ingrid-meta-settings.json' with { type: 'json' };
import { PostgresAggregator } from './persistence/postgres.aggregator.js';

const log = log4js.getLogger(import.meta.filename);

export const INGRID_META_INDEX = 'ingrid_meta';

export class ingridFactory extends ProfileFactory<CswMapper> {

    async init(): Promise<{ database: DatabaseUtils, elastic: ElasticsearchUtils }> {
        const { database, elastic } = await super.init();

        // create collections/catalogs and indices that occur in the configured harvesters, if they not already exist
        const catalogIdentifiers = new Set(ConfigService.get().map(harvester => harvester.catalogId).filter(id => id != null));
        for (let identifier of catalogIdentifiers) {
            await this.createCatalogIfNotExist(identifier, database, elastic);
        }

        // create ingrid_meta index
        let isIngridMeta = await elastic.isIndexPresent(INGRID_META_INDEX);
        if (!isIngridMeta) {
            await elastic.prepareIndexWithName(INGRID_META_INDEX, mappings, settings as any);
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

    getImporterFactory(): ImporterFactory {
        return new IngridImporterFactory();
    }

    getProfileName(): string {
        return 'ingrid';
    }

    getIndexDocumentFactory(mapper: CswMapper | WfsMapper): IndexDocumentFactory<IngridIndexDocument> {
        switch (mapper.constructor.name) {
            case 'CswMapper': return new ingridCswMapper(mapper as CswMapper);
            case 'WfsMapper': {
                let wfsProfile = (mapper as WfsMapper).settings.wfsProfile;
                switch (wfsProfile) {
                    case WfsProfile.pegelonline: return new PegelonlineWfsMapper(mapper as WfsMapper);
                    case WfsProfile.zdm: return new ZdmWfsMapper(mapper as WfsMapper);
                }
            }
            default:
                throw new Error(`No mapper "${mapper.constructor.name}" registered`);
        }
    }

    getPostgresAggregator(): AbstractPostgresAggregator<IngridIndexDocument> {
        return new PostgresAggregator();
    }

    useIndexPerCatalog(): boolean {
        return true;
    }
}
