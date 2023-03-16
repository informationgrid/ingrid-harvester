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

import {ExcelSparseImporter} from "../../../importer/excelsparse/excelsparse.importer";
import {CswImporter} from "../../../importer/csw/csw.importer";
import {WfsImporter} from "../../../importer/wfs/wfs.importer";
import { Harvester } from "@shared/harvester";
import {BaseMapper} from "../../../importer/base.mapper";
import {Importer} from "../../../importer/importer";
import {ProfileFactory} from "../../profile.factory";
import {ImporterFactory} from "../../../importer/importer.factory";

export class DiplanungImporterFactory extends ImporterFactory{

    public get(profile: ProfileFactory<BaseMapper>, config: Harvester): Importer {
        switch (config.type) {
            case 'EXCEL_SPARSE': return new ExcelSparseImporter(profile, config);
            case 'CSW': return new CswImporter(profile, config);
            case 'WFS': return new WfsImporter(profile, config);
            default: {
                console.error('Importer not found: ' + config.type);
            }
        }
    }
}
