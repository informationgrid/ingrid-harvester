/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2021 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

import {Importer} from "../importer";
import {CkanImporter} from "./ckan/ckan.importer";
import {ExcelImporter} from "./excel/excel.importer";
import {CswImporter} from "./csw/csw.importer";
import {CodedeImporter} from "./csw/codede.importer";
import {OaiImporter} from "./oai/oai.importer";
import {CkanSettings} from './ckan/ckan.settings';
import {ExcelSettings} from './excel/excel.settings';
import {CswSettings} from './csw/csw.settings';
import {OaiSettings} from './oai/oai.settings';
import {DcatImporter} from "./dcat/dcat.importer";
import {SparqlImporter} from "./sparql/sparql.importer";
import {SparqlSettings} from "./sparql/sparql.settings";

export class ImporterFactory {

    public static get(config: ExcelSettings | CkanSettings | CswSettings | OaiSettings | SparqlSettings): Importer {
        switch (config.type) {
            case 'CKAN':
                // remove trailing slash from CKAN URL
                let ckanConfig = config as CkanSettings;
                if (ckanConfig.ckanBaseUrl.endsWith('/')) {
                    ckanConfig.ckanBaseUrl = ckanConfig.ckanBaseUrl.slice(0, -1);
                }
                return new CkanImporter(ckanConfig);
            case 'EXCEL': return new ExcelImporter(config);
            case 'CSW': return new CswImporter(config);
            case 'CODEDE-CSW': return new CodedeImporter(config);
            case 'OAI': return new OaiImporter(config);
            case 'DCAT': return new DcatImporter(config);
            case 'SPARQL': return new SparqlImporter(config);
            default: {
                console.error('Importer not found: ' + config.type);
            }
        }
    }
}
