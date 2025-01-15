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

import { mcloudCkanMapper } from './mapper/mcloud.ckan.mapper';
import { mcloudCswMapper } from './mapper/mcloud.csw.mapper';
import { mcloudDcatMapper } from './mapper/mcloud.dcat.mapper';
import { mcloudExcelMapper } from './mapper/mcloud.excel.mapper';
import { mcloudIndexDocument } from './model/index.document';
import { mcloudOaiMapper } from './mapper/mcloud.oai.mapper';
import { mcloudSparqlMapper } from './mapper/mcloud.sparql.mapper';
import { CkanMapper } from '../../importer/ckan/ckan.mapper';
import { CswMapper } from '../../importer/csw/csw.mapper';
import { DcatMapper } from '../../importer/dcat/dcat.mapper';
import { ElasticQueries } from './persistence/elastic.queries';
import { ElasticQueries as AbstractElasticQueries } from '../../persistence/elastic.queries';
import { ExcelMapper } from '../../importer/excel/excel.mapper';
import { ImporterFactory } from '../../importer/importer.factory';
import { IndexDocumentFactory } from '../../model/index.document.factory';
import { IndexSettings } from '../../persistence/elastic.setting';
import { McloudImporterFactory } from './importer/mcloud.importer.factory';
import { OaiMapper } from '../../importer/oai/iso19139/oai.mapper';
import { PostgresAggregator } from './persistence/postgres.aggregator';
import { PostgresAggregator as AbstractPostgresAggregator} from '../../persistence/postgres.aggregator';
import { ProfileFactory } from '../profile.factory';
import { SparqlMapper } from '../../importer/sparql/sparql.mapper';

export class mcloudFactory extends ProfileFactory<CkanMapper | CswMapper | DcatMapper | ExcelMapper | OaiMapper | SparqlMapper> {

    getElasticQueries(): AbstractElasticQueries {
        return ElasticQueries.getInstance();
    }

    getIndexDocumentFactory(mapper: CkanMapper | CswMapper | DcatMapper | ExcelMapper | OaiMapper | SparqlMapper): IndexDocumentFactory<mcloudIndexDocument> {
        switch (mapper.constructor.name) {
            case 'CkanMapper': return new mcloudCkanMapper(<CkanMapper>mapper);
            case 'CswMapper': return new mcloudCswMapper(<CswMapper>mapper);
            case 'DcatMapper': return new mcloudDcatMapper(<DcatMapper>mapper);
            case 'ExcelMapper': return new mcloudExcelMapper(<ExcelMapper>mapper);
            case 'OaiMapper': return new mcloudOaiMapper(<OaiMapper>mapper);
            case 'SparqlMapper': return new mcloudSparqlMapper(<SparqlMapper>mapper);
        }
    }

    getIndexMappings(): any {
        return require('./persistence/elastic.mappings.json');
    }

    getIndexSettings(): IndexSettings {
        return require('./persistence/elastic.settings.json');;
    }

    getImporterFactory(): ImporterFactory {
        return new McloudImporterFactory();
    }

    getPostgresAggregator(): AbstractPostgresAggregator<mcloudIndexDocument> {
        return new PostgresAggregator();
    }

    getProfileName(): string {
        return 'mcloud';
    }

    useIndexPerCatalog(): boolean {
        return false;
    }
}
