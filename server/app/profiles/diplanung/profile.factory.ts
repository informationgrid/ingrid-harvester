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

import { CswMapper } from '../../importer/csw/csw.mapper';
import { DcatappluMapper } from '../../importer/dcatapplu/dcatapplu.mapper';
import { DiplanungCswMapper } from './mapper/diplanung.csw.mapper';
import { DiplanungDcatappluMapper } from './mapper/diplanung.dcatapplu.mapper';
import { DiplanungImporterFactory } from './importer/diplanung.importer.factory';
import { DiplanungIndexDocument } from './model/index.document';
import { DiplanungWfsMapper } from './mapper/diplanung.wfs.mapper';
import { ElasticQueries } from './persistence/elastic.queries';
import { ElasticQueries as AbstractElasticQueries } from '../../persistence/elastic.queries';
import { ExcelSparseMapper } from '../../importer/excelsparse/excelsparse.mapper';
import { FisWfsMapper } from '../../importer/wfs/fis/fis.wfs.mapper';
import { ImporterFactory } from '../../importer/importer.factory';
import { IndexDocumentFactory } from '../../model/index.document.factory';
import { IndexSettings } from '../../persistence/elastic.setting';
import { MsWfsMapper } from '../../importer/wfs/ms/ms.wfs.mapper';
import { PostgresAggregator } from './persistence/postgres.aggregator';
import { PostgresAggregator as AbstractPostgresAggregator } from '../../persistence/postgres.aggregator';
import { ProfileFactory } from '../profile.factory';
import { WfsMapper } from '../../importer/wfs/wfs.mapper';
import { XplanSynWfsMapper } from '../../importer/wfs/xplan/syn/xplan.syn.wfs.mapper';
import { XplanWfsMapper } from '../../importer/wfs/xplan/xplan.wfs.mapper';

export class DiplanungFactory extends ProfileFactory<CswMapper | DcatappluMapper | ExcelSparseMapper | WfsMapper> {

    getElasticQueries(): AbstractElasticQueries {
        return ElasticQueries.getInstance();
    }

    getIndexDocumentFactory(mapper: CswMapper | DcatappluMapper | ExcelSparseMapper | WfsMapper): IndexDocumentFactory<DiplanungIndexDocument> {
        switch (mapper.constructor.name) {
            case 'CswMapper': return new DiplanungCswMapper(<CswMapper>mapper);
            case 'DcatappluMapper': return new DiplanungDcatappluMapper(<DcatappluMapper>mapper);
            // case 'ExcelSparseMapper': return new DiplanungExcelSparseMapper(mapper);
            case 'FisWfsMapper': return new DiplanungWfsMapper(<FisWfsMapper>mapper);
            case 'MsWfsMapper': return new DiplanungWfsMapper(<MsWfsMapper>mapper);
            case 'XplanSynWfsMapper': return new DiplanungWfsMapper(<XplanSynWfsMapper>mapper);
            case 'XplanWfsMapper': return new DiplanungWfsMapper(<XplanWfsMapper>mapper);
        }
    }

    getIndexMappings(): any {
        return require('./persistence/elastic.mappings.json');
    }

    getIndexSettings(): IndexSettings {
        return require('./persistence/elastic.settings.json');;
    }

    getImporterFactory(): ImporterFactory {
        return new DiplanungImporterFactory();
    }

    getPostgresAggregator(): AbstractPostgresAggregator<DiplanungIndexDocument> {
        return new PostgresAggregator();
    }

    getProfileName(): string {
        return 'diplanung';
    }
}
