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

import type { CatalogSettings, CswCatalogSettings, ElasticsearchCatalogSettings, PiveauCatalogSettings } from '@shared/catalog.js';
import log4js from 'log4js';
import { Catalog, type CatalogColumnType, type CatalogOperation } from '../../catalog/catalog.factory.js';
import type { CkanMapper } from '../../importer/ckan/ckan.mapper.js';
import type { CkanSettings } from '../../importer/ckan/ckan.settings.js';
import type { CswMapper } from '../../importer/csw/csw.mapper.js';
import type { CswSettings } from '../../importer/csw/csw.settings.js';
import type { DcatapdeMapper } from '../../importer/dcatapde/dcatapde.mapper.js';
import type { DcatapdeSettings } from "../../importer/dcatapde/dcatapde.settings.js";
import type { GenesisMapper } from "../../importer/genesis/genesis.mapper.js";
import type { GenesisSettings } from "../../importer/genesis/genesis.settings.js";
import type { ImporterType } from '../../importer.settings.js';
import type { Importer } from '../../importer/importer.js';
import type { WfsMapper } from '../../importer/wfs/wfs.mapper.js';
import type { WfsSettings } from '../../importer/wfs/wfs.settings.js';
import { WfsProfile } from '../../importer/wfs/wfs.settings.js';
import type { DocumentFactory } from '../../model/index.document.factory.js';
import type { IndexDocument } from '../../model/index.document.js';
import type { Summary } from '../../model/summary.js';
import type { DatabaseUtils } from '../../persistence/database.utils.js';
import type { ElasticQueries as AbstractElasticQueries } from '../../persistence/elastic.queries.js';
import type { ElasticsearchUtils } from '../../persistence/elastic.utils.js';
import { ConfigService } from '../../services/config/ConfigService.js';
import { ProfileFactory } from '../profile.factory.js';
import { ingridCkanMapper } from './mapper/ingrid.ckan.mapper.js';
import { ingridCswMapper } from './mapper/ingrid.csw.mapper.js';
import { ingridDcatapdeMapper } from "./mapper/ingrid.dcatapde.mapper.js";
import { ingridGenesisMapper } from "./mapper/ingrid.genesis.mapper.js";
import type { ingridMapperType } from './mapper/ingrid.mapper.js';
import { ingridWfsMapper } from './mapper/ingrid.wfs.mapper.js';
import { PegelonlineWfsMapper } from './mapper/wfs/pegelonline.wfs.mapper.js';
import { ZdmWfsMapper } from './mapper/wfs/zdm.wfs.mapper.js';
import type { IngridMetadata } from './model/ingrid.metadata.js';
import { ElasticQueries } from './persistence/elastic.queries.js';
import mappings from './persistence/ingrid-meta-mapping.json' with { type: 'json' };
import settings from './persistence/ingrid-meta-settings.json' with { type: 'json' };

const log = log4js.getLogger(import.meta.filename);

export const INGRID_META_INDEX = 'ingrid_meta';

export type ingridSettings = CswSettings | WfsSettings | DcatapdeSettings | GenesisSettings;

export class ingridFactory extends ProfileFactory<ingridSettings> {

    async init(): Promise<{ database: DatabaseUtils, elastic: ElasticsearchUtils }> {
        const { database, elastic } = await super.init();
        // create ingrid_meta index
        let isIngridMeta = await elastic.isIndexPresent(INGRID_META_INDEX);
        if (!isIngridMeta) {
            await elastic.prepareIndexWithName(INGRID_META_INDEX, mappings, settings as any);
        }
        return { database, elastic };
    }

    protected getSupportedTypeNames(): ImporterType[] {
        return ["CSW", "CKAN", "DCATAPDE", "WFS", "GENESIS"];
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
            case 'GENESIS':
                const { GenesisImporter } = await import('../../importer/genesis/genesis.importer.js');
                importer = new GenesisImporter(settings as GenesisSettings);
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
            case 'CkanMapper': return new ingridCkanMapper(mapper as CkanMapper);
            case 'DcatapdeMapper': return new ingridDcatapdeMapper(mapper as DcatapdeMapper);
            case 'WfsMapper': {
                let wfsProfile = (mapper as WfsMapper).settings.wfsProfile;
                switch (wfsProfile) {
                    case WfsProfile.pegelonline: return new PegelonlineWfsMapper(mapper as WfsMapper);
                    case WfsProfile.zdm: return new ZdmWfsMapper(mapper as WfsMapper);
                    default: return new ingridWfsMapper(mapper as WfsMapper);
                }
            }
            case 'GenesisMapper': return new ingridGenesisMapper(mapper as GenesisMapper);
            default:
                throw new Error(`No mapper "${mapper.constructor.name}" registered`);
        }
    }

    async getCatalog(catalogId: number, summary: Summary): Promise<Catalog<CatalogColumnType, CatalogSettings, CatalogOperation>> {
        const catalogSettings = ConfigService.getCatalogSettings(catalogId);
        switch (catalogSettings?.type) {
            case 'elasticsearch':
                const { IngridElasticsearchCatalog } = await import('./catalog/elasticsearch.catalog.js');
                return new IngridElasticsearchCatalog(catalogSettings as ElasticsearchCatalogSettings, summary);
            case 'csw':
                const { IngridCswCatalog } = await import('./catalog/csw.catalog.js');
                return new IngridCswCatalog(catalogSettings as CswCatalogSettings, summary);
            case 'piveau':
                const { PiveauCatalog } = await import('../../catalog/piveau/piveau.catalog.js');
                return new PiveauCatalog(catalogSettings as PiveauCatalogSettings, summary);
            default:
                log.error(`Catalog type not found: ${catalogSettings.type}`);
        }
        return null;
    }

    getProfileName(): string {
        return 'ingrid';
    }
}
