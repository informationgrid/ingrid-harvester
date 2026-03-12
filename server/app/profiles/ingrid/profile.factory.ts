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
import { Catalog as NewCatalog } from '../../catalog/catalog.factory.js';
import type { CswCatalogSettings } from '../../catalog/csw/csw.catalog.js';
import type { ElasticsearchCatalogSettings } from '../../catalog/elasticsearch/elasticsearch.catalog.js';
import { PiveauCatalog, type PiveauCatalogSettings } from "../../catalog/piveau/piveau.catalog.js";
import type { CkanMapper } from '../../importer/ckan/ckan.mapper.js';
import type { CkanSettings } from '../../importer/ckan/ckan.settings.js';
import type { CswMapper } from '../../importer/csw/csw.mapper.js';
import type { CswSettings } from '../../importer/csw/csw.settings.js';
import type { DcatapdeMapper } from '../../importer/dcatapde/dcatapde.mapper.js';
import type { DcatapdeSettings } from "../../importer/dcatapde/dcatapde.settings.js";
import type { Importer } from '../../importer/importer.js';
import type { WfsMapper } from '../../importer/wfs/wfs.mapper.js';
import type { WfsSettings } from '../../importer/wfs/wfs.settings.js';
import { WfsProfile } from '../../importer/wfs/wfs.settings.js';
import type { Catalog } from '../../model/dcatApPlu.model.js';
import type { DocumentFactory } from '../../model/index.document.factory.js';
import type { IndexDocument } from '../../model/index.document.js';
import type { Summary } from '../../model/summary.js';
import { DatabaseFactory } from '../../persistence/database.factory.js';
import type { DatabaseUtils } from '../../persistence/database.utils.js';
import { ElasticsearchFactory } from '../../persistence/elastic.factory.js';
import type { ElasticQueries as AbstractElasticQueries } from '../../persistence/elastic.queries.js';
import type { ElasticsearchUtils } from '../../persistence/elastic.utils.js';
import type { PostgresAggregator as AbstractPostgresAggregator } from '../../persistence/postgres.aggregator.js';
import { ConfigService } from '../../services/config/ConfigService.js';
import { ProfileFactory } from '../profile.factory.js';
import { IngridCswCatalog } from './catalog/csw.catalog.js';
import { IngridElasticsearchCatalog } from './catalog/elasticsearch.catalog.js';
import { ingridCkanMapper } from './mapper/ingrid.ckan.mapper.js';
import { ingridCswMapper } from './mapper/ingrid.csw.mapper.js';
import { ingridDcatapdeMapper } from "./mapper/ingrid.dcatapde.mapper.js";
import type { ingridMapperType } from './mapper/ingrid.mapper.js';
import { ingridWfsMapper } from './mapper/ingrid.wfs.mapper.js';
import { PegelonlineWfsMapper } from './mapper/wfs/pegelonline.wfs.mapper.js';
import { ZdmWfsMapper } from './mapper/wfs/zdm.wfs.mapper.js';
import type { IngridIndexDocument } from './model/index.document.js';
import type { IngridMetadata } from './model/ingrid.metadata.js';
import { ElasticQueries } from './persistence/elastic.queries.js';
import mappings from './persistence/ingrid-meta-mapping.json' with { type: 'json' };
import settings from './persistence/ingrid-meta-settings.json' with { type: 'json' };
import { PostgresAggregator } from './persistence/postgres.aggregator.js';

const log = log4js.getLogger(import.meta.filename);

export const INGRID_META_INDEX = 'ingrid_meta';

export type ingridSettings = CswSettings | WfsSettings | DcatapdeSettings;

export class ingridFactory extends ProfileFactory<ingridSettings> {

    async init(): Promise<{ database: DatabaseUtils, elastic: ElasticsearchUtils }> {
        const { database, elastic } = await super.init();

        // DEPRECATED - kept for diplanung
        // create collections/catalogs and indices that occur in the configured harvesters, if they not already exist
        const oldCatalogIdentifiers = new Set(ConfigService.get().map(harvester => harvester.catalogId).filter(id => id != null));
        for (let identifier of oldCatalogIdentifiers) {
            await this.createCatalogIfNotExist(identifier, database, elastic);
        }

        // create index for each configured (and used!) catalog
        const catalogIdentifiers = new Set(ConfigService.get().map(harvester => harvester.catalogIds).flat());
        const catalogMap: Record<string, string> = ConfigService.getCatalogSettings()
            .filter(catalog => catalog.type == 'elasticsearch')
            .reduce((acc, obj) => (acc[obj.id] = (obj as ElasticsearchCatalogSettings).settings.index, acc), {});
        for (let identifier of catalogIdentifiers) {
            const index = catalogMap[identifier];
            if (!await elastic.isIndexPresent(index)) {
                await elastic.prepareIndexWithName(index, this.getIndexMappings(), this.getIndexSettings());
                await elastic.addAlias(index, ConfigService.getGeneralSettings().elasticsearch.alias);
            }
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

    // TODO solve this more elegantly than using dynamic imports - maybe using a registry?
    async getImporter(settings: ingridSettings): Promise<Importer<ingridSettings>> {
        let importer: Importer<ingridSettings>;
        switch (settings.type) {
            case 'CSW':
                const { CswImporter } = await import('../../importer/csw/csw.importer.js');
                importer = new CswImporter(settings as CswSettings);
                break;
            case 'CKAN':
                const { CkanImporter } = await import('../../importer/ckan/ckan.importer.js');
                importer = new CkanImporter(settings as CkanSettings);
                break;
            case 'DCATAPDE':
                const { DcatapdeImporter } = await import('../../importer/dcatapde/dcatapde.importer.js');
                importer = new DcatapdeImporter(settings as DcatapdeSettings);
                break;
            case 'WFS':
                const { WfsImporter } = await import('../../importer/wfs/wfs.importer.js');
                importer = new WfsImporter(settings as WfsSettings);
                break;
            default: {
                log.error('Importer not found: ' + settings.type);
            }
        }
        if (importer) {
            await importer.database.init();
        }
        return importer;
    }

    getDocumentFactory(mapper: ingridMapperType): DocumentFactory<IndexDocument & IngridMetadata> {
        switch (mapper.constructor.name) {
            case 'CswMapper': return new ingridCswMapper(mapper as CswMapper);
            case 'CKAN': return new ingridCkanMapper(mapper as CkanMapper);
            case 'DCATAPDE': return new ingridDcatapdeMapper(mapper as DcatapdeMapper);
            case 'WfsMapper': {
                let wfsProfile = (mapper as WfsMapper).getSettings().wfsProfile;
                switch (wfsProfile) {
                    case WfsProfile.pegelonline: return new PegelonlineWfsMapper(mapper as WfsMapper);
                    case WfsProfile.zdm: return new ZdmWfsMapper(mapper as WfsMapper);
                    default: return new ingridWfsMapper(mapper as WfsMapper);
                }
            }
            default:
                throw new Error(`No mapper "${mapper.constructor.name}" registered`);
        }
    }

    async getCatalog(catalogId: string, summary: Summary): Promise<NewCatalog<any>> {
        const catalogSettings = ConfigService.getCatalogSettings().find(config => config.id === catalogId);
        switch (catalogSettings.type) {
            case 'elasticsearch': return new IngridElasticsearchCatalog(catalogSettings as ElasticsearchCatalogSettings, summary);
            case 'csw': return new IngridCswCatalog(catalogSettings as CswCatalogSettings, summary);
            case 'piveau': return new PiveauCatalog(catalogSettings as PiveauCatalogSettings, summary);
            default: log.error(`Catalog type not found: ${catalogSettings.type}`);
        }
        return null;
    }

    getProfileName(): string {
        return 'ingrid';
    }

    getPostgresAggregator(settings: ElasticsearchCatalogSettings): AbstractPostgresAggregator<IngridIndexDocument> {
        return new PostgresAggregator(settings);
    }

    useIndexPerCatalog(): boolean {
        return true;
    }
}
