/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or – as soon they will be
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

import {DcatImporter} from "../../../importer/dcat/dcat.importer";
import {SparqlImporter} from "../../../importer/sparql/sparql.importer";
import { Harvester } from "@shared/harvester";
import {BaseMapper} from "../../../importer/base.mapper";
import {ProfileFactory} from "../../profile.factory";
import {McloudCswImporter} from "./mcloud.csw.importer";
import {McloudCkanImporter} from "./mcloud.ckan.importer";
import {ImporterFactory} from "../../../importer/importer.factory";
import {ExcelImporter} from "../../../importer/excel/excel.importer";
import {OaiImporter} from "../../../importer/oai/oai.importer";

export class McloudImporterFactory extends ImporterFactory{

    public get(profile: ProfileFactory<BaseMapper>, config: Harvester) {
        switch (config.type) {
            case 'CKAN': return new McloudCkanImporter(profile, config);
            case 'EXCEL': return new ExcelImporter(profile, config);
            case 'CSW': return new McloudCswImporter(profile, config);
            case 'OAI': return new OaiImporter(profile, config);
            case 'DCAT': return new DcatImporter(profile, config);
            case 'SPARQL': return new SparqlImporter(profile, config);
            default: {
                console.error('Importer not found: ' + config.type);
            }
        }
    }
}
