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

import type { CatalogSettings, ElasticsearchCatalogSettings } from '@shared/catalog.js';
import log4js from 'log4js';
import { Catalog, type CatalogColumnType, type CatalogOperation } from '../../catalog/catalog.factory.js';
import type { CswMapper } from '../../importer/csw/csw.mapper.js';
import type { CswSettings } from '../../importer/csw/csw.settings.js';
import type { DcatappluMapper } from '../../importer/dcatapplu/dcatapplu.mapper.js';
import type { DcatappluSettings } from '../../importer/dcatapplu/dcatapplu.settings.js';
import type { Importer } from '../../importer/importer.js';
import type { WfsMapper } from '../../importer/wfs/wfs.mapper.js';
import type { WfsSettings } from '../../importer/wfs/wfs.settings.js';
import type { DocumentFactory } from '../../model/index.document.factory.js';
import type { Summary } from '../../model/summary.js';
import type { ElasticQueries as AbstractElasticQueries } from '../../persistence/elastic.queries.js';
import { ConfigService } from '../../services/config/ConfigService.js';
import { ProfileFactory } from '../profile.factory.js';
import { DiplanungCswMapper } from './mapper/diplanung.csw.mapper.js';
import { DiplanungDcatappluMapper } from './mapper/diplanung.dcatapplu.mapper.js';
import { FisWfsMapper } from './mapper/wfs/fis.wfs.mapper.js';
import { MsWfsMapper } from './mapper/wfs/ms.wfs.mapper.js';
import { XplanSynWfsMapper } from './mapper/wfs/xplan.syn.wfs.mapper.js';
import { XplanWfsMapper } from './mapper/wfs/xplan.wfs.mapper.js';
import type { DiplanungIndexDocument } from './model/index.document.js';
import { ElasticQueries } from './persistence/elastic.queries.js';

const log = log4js.getLogger(import.meta.filename);

export type DiplanungSettings = CswSettings | DcatappluSettings | WfsSettings;

export class DiplanungFactory extends ProfileFactory<DiplanungSettings> {

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

    getDocumentFactory(mapper: CswMapper | DcatappluMapper | WfsMapper): DocumentFactory<DiplanungIndexDocument> {
        switch (mapper.constructor.name) {
            case 'CswMapper': return new DiplanungCswMapper(<CswMapper>mapper);
            case 'DcatappluMapper': return new DiplanungDcatappluMapper(<DcatappluMapper>mapper);
            case 'WfsMapper': {
                switch (mapper.settings.type) {
                    case 'WFS.FIS': return new FisWfsMapper(<WfsMapper>mapper);
                    case 'WFS.MS': return new MsWfsMapper(<WfsMapper>mapper);
                    case 'WFS.XPLAN.SYN': return new XplanSynWfsMapper(<WfsMapper>mapper);
                    case 'WFS.XPLAN': return new XplanWfsMapper(<WfsMapper>mapper);
                }
            }
        }
    }

    // TODO solve this more elegantly than using dynamic imports - maybe using a registry?
    async getImporter(settings: DiplanungSettings): Promise<Importer<DiplanungSettings>> {
        let importer: Importer<DiplanungSettings>;
        switch (settings.type) {
            case 'CSW':
                const { DiplanungCswImporter } = await import('./importer/diplanung.csw.importer.js');
                importer = new DiplanungCswImporter(settings as CswSettings);
                break;
            case 'DCATAPPLU':
                const { DcatappluImporter } = await import('../../importer/dcatapplu/dcatapplu.importer.js');
                importer = new DcatappluImporter(settings as DcatappluSettings);
                break;
            case 'WFS.FIS':
            case 'WFS.MS':
            case 'WFS.XPLAN':
            case 'WFS.XPLAN.SYN':
                const { DiplanungWfsImporter } = await import('./importer/diplanung.wfs.importer.js');
                importer = new DiplanungWfsImporter(settings as WfsSettings);
                break;
            default: {
                log.error('Importer not found: ' + settings.type);
            }
        }
        if (importer) {
            await importer.database.init();
        }
        return importer;
    }

    async getCatalog(catalogId: number, summary: Summary): Promise<Catalog<CatalogColumnType, CatalogSettings, CatalogOperation>> {
        const catalogSettings = ConfigService.getCatalogSettings(catalogId);
        switch (catalogSettings?.type) {
            case 'elasticsearch':
                const { DiplanungElasticsearchCatalog } = await import('./catalog/elasticsearch.catalog.js');
                return new DiplanungElasticsearchCatalog(catalogSettings as ElasticsearchCatalogSettings, summary);
            default:
                log.error(`Catalog type not found: ${catalogSettings.type}`);
        }
        return null;
    }

    getProfileName(): string {
        return 'diplanung';
    }
}
