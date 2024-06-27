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

import { Harvester } from '@shared/harvester';
import { Importer } from '../../../importer/importer';
import { ImporterFactory } from '../../../importer/importer.factory';
import { KldImporter } from '../../../importer/kld/kld.importer';
import { KldSettings } from '../../../importer/kld/kld.settings';
import { OaiImporter as OaiLidoImporter } from '../../../importer/oai/lido/oai.importer';
import { OaiImporter as OaiMetsImporter } from '../../../importer/oai/mets/oai.importer';
import { OaiSettings } from '../../../importer/oai/oai.settings';

const log = require('log4js').getLogger(__filename);

export class LvrImporterFactory extends ImporterFactory {

    public async get(config: Harvester): Promise<Importer> {
        let importer: Importer;
        switch (config.type) {
            case 'OAI':
                switch ((config as OaiSettings).metadataPrefix?.toLowerCase()) {
                    case 'lido':
                        importer = new OaiLidoImporter(config);
                        break;
                    case 'mods':
                        importer = new OaiMetsImporter(config);
                        break;
                    default:
                        throw new Error('Profile LVR only supports `mods` and `lido` prefixes for OAI-PMH harvester');
                }
                break;
            case 'KLD':
                importer = new KldImporter(config as KldSettings);
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
