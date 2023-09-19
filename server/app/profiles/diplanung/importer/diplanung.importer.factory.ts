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

import { DiplanungCswImporter } from './diplanung.csw.importer';
import { DiplanungDcatappluImporter } from './diplanung.dcatapplu.importer';
import { DiplanungExcelSparseImporter } from './diplanung.excelsparse.importer';
import { DiplanungFisWfsImporter } from './diplanung.fis.wfs.importer';
import { DiplanungXplanSynWfsImporter } from './diplanung.xplan.syn.wfs.importer';
import { DiplanungXplanWfsImporter } from './diplanung.xplan.wfs.importer';
import { Harvester } from '@shared/harvester';
import { Importer } from '../../../importer/importer';
import { ImporterFactory } from '../../../importer/importer.factory';

export class DiplanungImporterFactory extends ImporterFactory {

    public async get(config: Harvester): Promise<Importer> {
        let importer: Importer;
        switch (config.type) {
            case 'EXCEL_SPARSE':
                importer = new DiplanungExcelSparseImporter(config);
                break;
            case 'CSW':
                importer = new DiplanungCswImporter(config);
                break;
            case 'WFS.FIS':
                importer = new DiplanungFisWfsImporter(config);
                break;
            case 'WFS.XPLAN':
                importer = new DiplanungXplanWfsImporter(config);
                break;
            case 'WFS.XPLAN.SYN':
                importer = new DiplanungXplanSynWfsImporter(config);
                break;
            case 'DCATAPPLU':
                importer = new DiplanungDcatappluImporter(config);
                break;
            default: {
                console.error('Importer not found: ' + config.type);
            }
        }
        if (importer) {
            await importer.database.init();
        }
        return importer;
    }
}
