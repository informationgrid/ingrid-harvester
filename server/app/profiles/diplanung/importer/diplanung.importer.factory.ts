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

import { DcatappluImporter } from '../../../importer/dcatapplu/dcatapplu.importer';
import { DiplanungCswImporter } from './diplanung.csw.importer';
import { Harvester } from '@shared/harvester';
import { Importer } from '../../../importer/importer';
import { ImporterFactory } from '../../../importer/importer.factory';
import { WfsImporter } from '../../../importer/wfs/wfs.importer';
import { WfsSettings } from 'importer/wfs/wfs.settings';

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
            case 'WFS.FIS': 
            case 'WFS.MS': 
            case 'WFS.XPLAN': 
            case 'WFS.XPLAN.SYN': 
                importer = new WfsImporter(config as WfsSettings);
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
