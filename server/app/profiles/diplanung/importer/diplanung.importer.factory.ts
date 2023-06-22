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
import { ExcelSparseImporter } from '../../../importer/excelsparse/excelsparse.importer';
import { FisWfsImporter } from '../../../importer/wfs/fis/fis.wfs.importer';
import { Harvester } from '@shared/harvester';
import { Importer } from '../../../importer/importer';
import { ImporterFactory } from '../../../importer/importer.factory';
import { XplanWfsImporter } from '../../../importer/wfs/xplan/xplan.wfs.importer';

export class DiplanungImporterFactory extends ImporterFactory{

    public get(config: Harvester): Importer {
        switch (config.type) {
            case 'EXCEL_SPARSE': return new ExcelSparseImporter(config);
            case 'CSW': return new DiplanungCswImporter(config);
            case 'WFS.FIS': return new FisWfsImporter(config);
            case 'WFS.XPLAN': return new XplanWfsImporter(config);
            default: {
                console.error('Importer not found: ' + config.type);
            }
        }
    }
}
