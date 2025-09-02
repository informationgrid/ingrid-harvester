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

import { DcatappluImporter } from '../../../importer/dcatapplu/dcatapplu.importer.js';
import { DiplanungCswImporter } from './diplanung.csw.importer.js';
import { ExcelSparseImporter } from '../../../importer/excelsparse/excelsparse.importer.js';
import { FisWfsImporter } from '../../../importer/wfs/fis/fis.wfs.importer.js';
import { Harvester } from '@shared/harvester';
import { Importer } from '../../../importer/importer.js';
import { ImporterFactory } from '../../../importer/importer.factory.js';
import { MsWfsImporter } from '../../../importer/wfs/ms/ms.wfs.importer.js';
import { XplanSynWfsImporter } from '../../../importer/wfs/xplan/syn/xplan.syn.wfs.importer.js';
import { XplanWfsImporter } from '../../../importer/wfs/xplan/xplan.wfs.importer.js';

const log = require('log4js').getLogger(__filename);

export class DiplanungImporterFactory extends ImporterFactory {

    public async get(config: Harvester): Promise<Importer> {
        let importer: Importer;
        switch (config.type) {
            case 'CSW': 
                importer = new DiplanungCswImporter(config);
                break;
            case 'DCATAPPLU': 
                importer = new DcatappluImporter(config);
                break;
            case 'EXCEL_SPARSE': 
                importer = new ExcelSparseImporter(config);
                break;
            case 'WFS.FIS': 
                importer = new FisWfsImporter(config);
                break;
            case 'WFS.MS': 
                importer = new MsWfsImporter(config);
                break;
            case 'WFS.XPLAN': 
                importer = new XplanWfsImporter(config);
                break;
            case 'WFS.XPLAN.SYN': 
                importer = new XplanSynWfsImporter(config);
                break;
            default: {
                log.error('Importer not found: ' + config.type);
            }
        }
        if (importer) {
            await importer.database.init();
        }
        return importer;
    }
}
