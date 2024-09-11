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

import { DcatImporter } from '../../../importer/dcat/dcat.importer';
import { ExcelImporter } from '../../../importer/excel/excel.importer';
import { Importer } from '../../../importer/importer';
import { ImporterFactory } from '../../../importer/importer.factory';
import { Harvester } from '@shared/harvester';
import { McloudCkanImporter } from './mcloud.ckan.importer';
import { McloudCswImporter } from './mcloud.csw.importer';
import { OaiImporter } from '../../../importer/oai/oai.importer';
import { SparqlImporter } from '../../../importer/sparql/sparql.importer';

const log = require('log4js').getLogger(__filename);

export class McloudImporterFactory extends ImporterFactory{

    public async get(config: Harvester): Promise<Importer> {
        let importer: Importer;
        switch (config.type) {
            case 'CKAN':
                importer = new McloudCkanImporter(config);
                break;
            case 'EXCEL':
                importer = new ExcelImporter(config);
                break;
            case 'CSW':
                importer = new McloudCswImporter(config);
                break;
            case 'OAI':
                importer = new OaiImporter(config);
                break;
            case 'DCAT':
                importer = new DcatImporter(config);
                break;
            case 'SPARQL':
                importer = new SparqlImporter(config);
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
