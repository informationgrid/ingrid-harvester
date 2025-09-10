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
import type { Harvester } from '@shared/harvester.js';
import { Importer } from '../../../importer/importer.js';
import { ImporterFactory } from '../../../importer/importer.factory.js';
import type { WfsSettings } from '../../../importer/wfs/wfs.settings.js';
import { ZdmWfsImporter } from './zdm.wfs.importer.js';

const log = log4js.getLogger(__filename);

export class ZdmImporterFactory extends ImporterFactory{

    public async get(config: Harvester): Promise<Importer> {
        let importer: Importer;
        switch (config.type) {
            case 'WFS':
                importer = new ZdmWfsImporter(config as WfsSettings);
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
