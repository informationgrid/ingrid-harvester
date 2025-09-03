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

import { ElasticQueries } from './persistence/elastic.queries.js';
import type { ElasticQueries as AbstractElasticQueries } from '../../persistence/elastic.queries.js';
import type { ImporterFactory } from '../../importer/importer.factory.js';
import type { IndexDocumentFactory } from '../../model/index.document.factory.js';
import type { JsonMapper } from '.../../importer/json/json.mapper.js';
import type { KldMapper } from '../../importer/kld/kld.mapper.js';
import { LvrClickRheinMapper } from './mapper/lvr.clickrhein.mapper.js';
import { LvrImporterFactory } from './importer/lvr.importer.factory.js';
import type { LvrIndexDocument } from './model/index.document.js';
import { LvrKldMapper } from './mapper/lvr.kld.mapper.js';
import { LvrOaiLidoMapper } from './mapper/lvr.oai.lido.mapper.js';
import { LvrOaiModsMapper } from './mapper/lvr.oai.mods.mapper.js';
import type { OaiMapper as OaiLidoMapper } from '../../importer/oai/lido/oai.mapper.js';
import type { OaiMapper as OaiModsMapper } from '../../importer/oai/mods/oai.mapper.js';
import type { OaiSettings } from '../../importer/oai/oai.settings.js';
import { PostgresAggregator } from './persistence/postgres.aggregator.js';
import type { PostgresAggregator as AbstractPostgresAggregator} from '../../persistence/postgres.aggregator.js';
import { ProfileFactory } from '../profile.factory.js';

export class LvrFactory extends ProfileFactory<JsonMapper | KldMapper | OaiLidoMapper | OaiModsMapper> {

    getElasticQueries(): AbstractElasticQueries {
        return ElasticQueries.getInstance();
    }

    getIndexDocumentFactory(mapper: JsonMapper | KldMapper | OaiLidoMapper | OaiModsMapper): IndexDocumentFactory<LvrIndexDocument> {
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

    getImporterFactory(): ImporterFactory {
        return new LvrImporterFactory();
    }

    getPostgresAggregator(): AbstractPostgresAggregator<LvrIndexDocument> {
        return new PostgresAggregator();
    }

    getProfileName(): string {
        return 'lvr';
    }

    useIndexPerCatalog(): boolean {
        return false;
    }
}
