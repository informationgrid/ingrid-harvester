/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
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
import { IndexDocumentFactory } from 'model/index.document.factory';
import { IndexSettings } from '../../persistence/elastic.setting';
import { KldMapper } from 'importer/kld/kld.mapper';
import { LvrImporterFactory } from './importer/lvr.importer.factory';
import { LvrIndexDocument } from './model/index.document';
import { LvrKldMapper } from './mapper/lvr.kld.mapper';
import { LvrOaiMapper } from './mapper/lvr.oai.mapper';
import { OaiMapper } from '../../importer/oai/lido/oai.mapper';
import { PostgresAggregator } from './persistence/postgres.aggregator';
import { PostgresAggregator as AbstractPostgresAggregator} from '../../persistence/postgres.aggregator';
import { PostgresQueries } from './persistence/postgres.queries';
import { PostgresQueries as AbstractPostgresQueries } from '../../persistence/postgres.queries';
import { ProfileFactory } from '../profile.factory';

export class LvrFactory extends ProfileFactory<KldMapper | OaiMapper> {

    getElasticQueries(): AbstractElasticQueries {
        return ElasticQueries.getInstance();
    }

    getIndexDocumentFactory(mapper: KldMapper | OaiMapper): IndexDocumentFactory<LvrIndexDocument> {
        switch (mapper.constructor.name) {
            case 'KldMapper': return new LvrKldMapper(<KldMapper>mapper);
            case 'OaiMapper': return new LvrOaiMapper(<OaiMapper>mapper);
        }
    }

    getIndexMappings(): any {
        return require('./persistence/elastic.mappings.json');
    }

    getIndexSettings(): IndexSettings {
        return require('./persistence/elastic.settings.json');;
    }

    getImporterFactory(): ImporterFactory {
        return new LvrImporterFactory();
    }

    getPostgresAggregator(): AbstractPostgresAggregator<LvrIndexDocument> {
        return new PostgresAggregator();
    }

    getPostgresQueries(): AbstractPostgresQueries {
        return PostgresQueries.getInstance();
    }

    getProfileName(): string {
        return 'lvr';
    }
}
