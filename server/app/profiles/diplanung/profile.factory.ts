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

import type { CswMapper } from '../../importer/csw/csw.mapper.js';
import type { DcatappluMapper } from '../../importer/dcatapplu/dcatapplu.mapper.js';
import { DiplanungCswMapper } from './mapper/diplanung.csw.mapper.js';
import { DiplanungDcatappluMapper } from './mapper/diplanung.dcatapplu.mapper.js';
import { DiplanungImporterFactory } from './importer/diplanung.importer.factory.js';
import type { DiplanungIndexDocument } from './model/index.document.js';
import { ElasticQueries } from './persistence/elastic.queries.js';
import type { ElasticQueries as AbstractElasticQueries } from '../../persistence/elastic.queries.js';
import type { ExcelSparseMapper } from '../../importer/excelsparse/excelsparse.mapper.js';
import type { FisWfsMapper } from './mapper/wfs/fis.wfs.mapper.js';
import type { ImporterFactory } from '../../importer/importer.factory.js';
import type { IndexDocumentFactory } from '../../model/index.document.factory.js';
import type { MsWfsMapper } from './mapper/wfs/ms.wfs.mapper.js';
import { PostgresAggregator } from './persistence/postgres.aggregator.js';
import type { PostgresAggregator as AbstractPostgresAggregator } from '../../persistence/postgres.aggregator.js';
import { ProfileFactory } from '../profile.factory.js';
import type { WfsMapper } from '../../importer/wfs/wfs.mapper.js';
import type { XplanSynWfsMapper } from './mapper/wfs/xplan.syn.wfs.mapper.js';
import type { XplanWfsMapper } from './mapper/wfs/xplan.wfs.mapper.js';

export class DiplanungFactory extends ProfileFactory<CswMapper | DcatappluMapper | ExcelSparseMapper | WfsMapper> {

    dateReplacer = (key: string, value: any): any => {
        // when used as a JSON.stringify callback, `this` refers to the to-be-stringified object
        // we cannot use `value` directly, because `Date` provides an inbuilt serialization via `Date.toJSON()`
        // DIPLANUNG: we use seconds instead of milliseconds! this is the same as in the OGC API for RECORDS
        if (this[key] instanceof Date) {
            return Math.floor(this[key].valueOf() / 1000);
        }
        return value;
    };

    getElasticQueries(): AbstractElasticQueries {
        return ElasticQueries.getInstance();
    }

    getIndexDocumentFactory(mapper: CswMapper | DcatappluMapper | ExcelSparseMapper | WfsMapper): IndexDocumentFactory<DiplanungIndexDocument> {
        switch (mapper.constructor.name) {
            case 'CswMapper': return new DiplanungCswMapper(<CswMapper>mapper);
            case 'DcatappluMapper': return new DiplanungDcatappluMapper(<DcatappluMapper>mapper);
            case 'FisWfsMapper': return new FisWfsMapper(<WfsMapper>mapper);
            case 'MsWfsMapper': return new MsWfsMapper(<WfsMapper>mapper);
            case 'XplanSynWfsMapper': return new XplanSynWfsMapper(<WfsMapper>mapper);
            case 'XplanWfsMapper': return new XplanWfsMapper(<WfsMapper>mapper);
        }
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

    useIndexPerCatalog(): boolean {
        return false;
    }
}
