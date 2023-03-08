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

import { indexMappings } from './persistence/elastic.mappings';
import { indexSettings } from './persistence/elastic.settings';
import { CswMapper } from '../../importer/csw/csw.mapper';
import { ElasticQueries as AbstractElasticQueries } from '../../persistence/elastic.queries';
import { ElasticQueries } from './persistence/elastic.queries';
import { ImporterFactory } from '../../importer/importer.factory';
import { IngridImporterFactory } from './importer/ingrid.importer.factory';
import { IndexSettings } from '../../persistence/elastic.setting';
import { PostgresQueries as AbstractPostgresQueries } from '../../persistence/postgres.queries';
import { PostgresQueries } from './persistence/postgres.queries';
import { ProfileFactory } from '../profile.factory';
import {IndexDocumentFactory} from "../../model/index.document.factory";
import {IngridIndexDocument} from "./model/index.document";
import {ingridCswMapper} from "./mapper/ingrid.csw.mapper";
import {PostgresAggregator as AbstractPostgresAggregator} from "../../persistence/postgres.aggregator";
import {PostgresAggregator} from "./persistence/postgres.aggregator";

export class ingridFactory extends ProfileFactory<CswMapper> {

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

    getPostgresQueries(): AbstractPostgresQueries {
        return PostgresQueries.getInstance();
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
}
