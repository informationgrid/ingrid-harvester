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

import { elasticsearchMapping } from './elastic/elastic.mapping';
import { elasticsearchSettings } from './elastic/elastic.settings';
import { CswMapper } from '../../importer/csw/csw.mapper';
import { DeduplicateUtils } from './elastic/deduplicate.utils';
import { DiPlanungDocument } from './model/index.document';
import { DiplanungImporterFactory } from './importer/diplanung.importer.factory';
import { ElasticQueries } from './elastic//elastic.queries';
import { ElasticSearchUtils } from '../../utils/elastic.utils';
import { ElasticSettings } from '../../utils/elastic.setting';
import { ExcelSparseMapper } from '../../importer/excelsparse/excelsparse.mapper';
import { ImporterFactory } from '../../importer/importer.factory';
import { ProfileFactory } from '../profile.factory';
import { Summary } from '../../model/summary';
import { WfsMapper } from '../../importer/wfs/wfs.mapper';

export class DiplanungFactory extends ProfileFactory<CswMapper | ExcelSparseMapper | WfsMapper> {

    getIndexDocument(): DiPlanungDocument {
        return new DiPlanungDocument();
    }

    getElasticMapping(): any {
        return elasticsearchMapping;
    }

    getElasticQueries(): any {
        return ElasticQueries.getInstance();
    }

    getElasticSettings(): any {
        return elasticsearchSettings;
    }

    getDeduplicationUtils(elasticUtils: ElasticSearchUtils, elasticSettings: ElasticSettings, summary: Summary): DeduplicateUtils {
        return new DeduplicateUtils(elasticUtils, ElasticQueries.getInstance(), elasticSettings, summary);
    }

    getImporterFactory(): ImporterFactory {
        return new DiplanungImporterFactory();
    }
}
