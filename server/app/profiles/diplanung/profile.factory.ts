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

import { indexMappings } from './elastic/elastic.mappings';
import { indexSettings } from './elastic/elastic.settings';
import { DeduplicateUtils } from './elastic/deduplicate.utils';
import { DiplanungCswMapper } from './mapper/diplanung.csw.mapper';
import { DiPlanungDocument } from './model/index.document';
import { DiplanungImporterFactory } from './importer/diplanung.importer.factory';
import { DiplanungVirtualMapper } from './mapper/diplanung.virtual.mapper';
import { ElasticQueries } from './elastic/elastic.queries';
import { ElasticsearchUtils } from '../../persistence/elastic.utils';
import { ExcelSparseMapper } from '../../importer/excelsparse/excelsparse.mapper';
import { ImporterFactory } from '../../importer/importer.factory';
import { IndexSettings } from '../../persistence/elastic.setting';
import { ProfileFactory } from '../profile.factory';
import { Summary } from '../../model/summary';
import { WfsMapper } from '../../importer/wfs/wfs.mapper';
import { DcatappluMapper } from "../../importer/dcatapplu/dcatapplu.mapper";

export class DiplanungFactory extends ProfileFactory<DiplanungCswMapper | DiplanungVirtualMapper | ExcelSparseMapper | WfsMapper | DcatappluMapper> {

    getProfileName(): string {
        return 'diplanung';
    }

    getIndexDocument(): DiPlanungDocument {
        return new DiPlanungDocument();
    }

    getIndexMappings(): any {
        return indexMappings;
    }

    getElasticQueries(): any {
        return ElasticQueries.getInstance();
    }

    getIndexSettings(): IndexSettings {
        return indexSettings;
    }

    getDeduplicationUtils(elasticUtils: ElasticsearchUtils, summary: Summary): DeduplicateUtils {
        return new DeduplicateUtils(elasticUtils, summary);
    }

    getImporterFactory(): ImporterFactory {
        return new DiplanungImporterFactory();
    }
}
