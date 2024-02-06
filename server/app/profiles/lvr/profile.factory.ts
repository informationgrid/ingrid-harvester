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

import { OaiMapper } from 'importer/oai/oai.mapper';
import { ImporterFactory } from '../../importer/importer.factory';
import { ElasticQueries as AbstractElasticQueries } from '../../persistence/elastic.queries';
import { IndexSettings } from '../../persistence/elastic.setting';
import { PostgresQueries as AbstractPostgresQueries } from '../../persistence/postgres.queries';
import { ProfileFactory } from '../profile.factory';
import { LvrImporterFactory } from './importer/lvr.importer.factory';
import { LvrDocument } from './model/index.document';
import { ElasticQueries } from './persistence/elastic.queries';
import { PostgresQueries } from './persistence/postgres.queries';

export class LvrFactory extends ProfileFactory<OaiMapper> {

    getElasticQueries(): AbstractElasticQueries {
        return ElasticQueries.getInstance();
    }

    getIndexDocument(): LvrDocument {
        return new LvrDocument();
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

    getPostgresQueries(): AbstractPostgresQueries {
        return PostgresQueries.getInstance();
    }

    getProfileName(): string {
        return 'lvr';
    }
}
