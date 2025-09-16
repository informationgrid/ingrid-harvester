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

import log4js from 'log4js';
import { DcatappluImporter } from '../../../importer/dcatapplu/dcatapplu.importer.js';
import { DiplanungCswImporter } from './diplanung.csw.importer.js';
import { DiplanungWfsImporter } from './diplanung.wfs.importer.js';
import type { Harvester } from '@shared/harvester.js';
import type { Importer } from '../../../importer/importer.js';
import { ImporterFactory } from '../../../importer/importer.factory.js';
import type { WfsSettings } from '../../../importer/wfs/wfs.settings.js';

const log = log4js.getLogger(import.meta.filename);

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
                importer = new DiplanungWfsImporter(config as WfsSettings);
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
