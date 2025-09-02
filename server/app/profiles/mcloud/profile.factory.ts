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

import { mcloudCkanMapper } from './mapper/mcloud.ckan.mapper.js';
import { mcloudCswMapper } from './mapper/mcloud.csw.mapper.js';
import { mcloudDcatMapper } from './mapper/mcloud.dcat.mapper.js';
import { mcloudExcelMapper } from './mapper/mcloud.excel.mapper.js';
import { mcloudIndexDocument } from './model/index.document.js';
import { mcloudOaiMapper } from './mapper/mcloud.oai.mapper.js';
import { mcloudSparqlMapper } from './mapper/mcloud.sparql.mapper.js';
import { CkanMapper } from '../../importer/ckan/ckan.mapper.js';
import { CswMapper } from '../../importer/csw/csw.mapper.js';
import { DcatMapper } from '../../importer/dcat/dcat.mapper.js';
import { ElasticQueries } from './persistence/elastic.queries.js';
import { ElasticQueries as AbstractElasticQueries } from '../../persistence/elastic.queries.js';
import { ExcelMapper } from '../../importer/excel/excel.mapper.js';
import { ImporterFactory } from '../../importer/importer.factory.js';
import { IndexDocumentFactory } from '../../model/index.document.factory.js';
import { McloudImporterFactory } from './importer/mcloud.importer.factory.js';
import { OaiMapper } from '../../importer/oai/iso19139/oai.mapper.js';
import { PostgresAggregator } from './persistence/postgres.aggregator.js';
import { PostgresAggregator as AbstractPostgresAggregator} from '../../persistence/postgres.aggregator.js';
import { ProfileFactory } from '../profile.factory.js';
import { SparqlMapper } from '../../importer/sparql/sparql.mapper.js';

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
