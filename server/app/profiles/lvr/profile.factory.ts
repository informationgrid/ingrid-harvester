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

import { ElasticQueries } from './persistence/elastic.queries';
import { ElasticQueries as AbstractElasticQueries } from '../../persistence/elastic.queries';
import { ImporterFactory } from '../../importer/importer.factory';
import { IndexDocumentFactory } from '../../model/index.document.factory';
import { JsonMapper } from '.../../importer/json/json.mapper';
import { KldMapper } from '../../importer/kld/kld.mapper';
import { LvrClickRheinMapper } from './mapper/lvr.clickrhein.mapper';
import { LvrImporterFactory } from './importer/lvr.importer.factory';
import { LvrIndexDocument } from './model/index.document';
import { LvrKldMapper } from './mapper/lvr.kld.mapper';
import { LvrOaiLidoMapper } from './mapper/lvr.oai.lido.mapper';
import { LvrOaiModsMapper } from './mapper/lvr.oai.mods.mapper';
import { OaiMapper as OaiLidoMapper } from '../../importer/oai/lido/oai.mapper';
import { OaiMapper as OaiModsMapper } from '../../importer/oai/mods/oai.mapper';
import { OaiSettings } from '../../importer/oai/oai.settings';
import { PostgresAggregator } from './persistence/postgres.aggregator';
import { PostgresAggregator as AbstractPostgresAggregator} from '../../persistence/postgres.aggregator';
import { ProfileFactory } from '../profile.factory';

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
