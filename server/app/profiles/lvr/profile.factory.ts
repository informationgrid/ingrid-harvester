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

import type { ElasticsearchCatalogSettings } from '@shared/catalog.js';
import log4js from 'log4js';
import type { Catalog as NewCatalog } from '../../catalog/catalog.factory.js';
import type { Importer } from '../../importer/importer.js';
import type { JsonMapper } from '../../importer/json/json.mapper.js';
import type { JsonSettings } from '../../importer/json/json.settings.js';
import type { KldMapper } from '../../importer/kld/kld.mapper.js';
import type { KldSettings } from '../../importer/kld/kld.settings.js';
import type { OaiMapper as OaiLidoMapper } from '../../importer/oai/lido/oai.mapper.js';
import type { OaiMapper as OaiModsMapper } from '../../importer/oai/mods/oai.mapper.js';
import type { OaiSettings } from '../../importer/oai/oai.settings.js';
import type { DocumentFactory } from '../../model/index.document.factory.js';
import type { Summary } from '../../model/summary.js';
import type { ElasticQueries as AbstractElasticQueries } from '../../persistence/elastic.queries.js';
import type { PostgresAggregator as AbstractPostgresAggregator } from '../../persistence/postgres.aggregator.js';
import { ConfigService } from '../../services/config/ConfigService.js';
import { ProfileFactory } from '../profile.factory.js';
import { LvrClickRheinMapper } from './mapper/lvr.clickrhein.mapper.js';
import { LvrKldMapper } from './mapper/lvr.kld.mapper.js';
import { LvrOaiLidoMapper } from './mapper/lvr.oai.lido.mapper.js';
import { LvrOaiModsMapper } from './mapper/lvr.oai.mods.mapper.js';
import type { LvrIndexDocument } from './model/index.document.js';
import { ElasticQueries } from './persistence/elastic.queries.js';
import { PostgresAggregator } from './persistence/postgres.aggregator.js';

const log = log4js.getLogger(import.meta.filename);

export type LvrSettings = JsonSettings | KldSettings | OaiSettings;

export class LvrFactory extends ProfileFactory<LvrSettings> {

    getElasticQueries(): AbstractElasticQueries {
        return ElasticQueries.getInstance();
    }

    getDocumentFactory(mapper: JsonMapper | KldMapper | OaiLidoMapper | OaiModsMapper): DocumentFactory<LvrIndexDocument> {
        switch (mapper.constructor.name) {
            case 'JsonMapper': return new LvrClickRheinMapper(<JsonMapper>mapper);
            case 'KldMapper': return new LvrKldMapper(<KldMapper>mapper);
            case 'OaiMapper':
                switch ((mapper.getSettings() as OaiSettings).metadataPrefix?.toLowerCase()) {
                    case 'lido': return new LvrOaiLidoMapper(<OaiLidoMapper>mapper);
                    case 'mods': return new LvrOaiModsMapper(<OaiModsMapper>mapper);
                    default: throw new Error('Profile LVR only supports `mods` and `lido` prefixes for OAI-PMH harvester');
                }
        }
    }

    // TODO solve this more elegantly than using dynamic imports - maybe using a registry?
    async getImporter(settings: LvrSettings): Promise<Importer<LvrSettings>> {
        let importer: Importer<LvrSettings>;
        switch (settings.type) {
            case 'JSON':
                const { LvrClickRheinImporter } = await import('./importer/lvr.clickrhein.importer.js');
                importer = new LvrClickRheinImporter(settings as JsonSettings);
                break;
            case 'KLD':
                const { KldImporter } = await import('../../importer/kld/kld.importer.js');
                importer = new KldImporter(settings as KldSettings);
                break;
            case 'OAI':
                const { OaiImporter } = await import('../../importer/oai/oai.importer.js');
                importer = new OaiImporter(settings as OaiSettings);
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
    
    async getCatalog(catalogId: number, summary: Summary): Promise<NewCatalog<any>> {
        const catalogSettings = ConfigService.getCatalogSettings(catalogId);
        switch (catalogSettings?.type) {
            case 'elasticsearch':
                const { LvrElasticsearchCatalog } = await import('./catalog/elasticsearch.catalog.js');
                return new LvrElasticsearchCatalog(catalogSettings as ElasticsearchCatalogSettings, summary);
            default:
                log.error(`Catalog type not found: ${catalogSettings.type}`);
        }
        return null;
    }

    getProfileName(): string {
        return 'lvr';
    }

    getPostgresAggregator(settings: ElasticsearchCatalogSettings): AbstractPostgresAggregator<LvrIndexDocument> {
        return new PostgresAggregator(settings);
    }

    useIndexPerCatalog(): boolean {
        return false;
    }
}
