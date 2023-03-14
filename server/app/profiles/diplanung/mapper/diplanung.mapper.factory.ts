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

import {CkanMapper} from "../../../importer/ckan/ckan.mapper";
import {ProviderField} from "../../../importer/ckan/ckan.settings";
import {Person} from "../../../model/agent";
import {CswMapper} from "../../../importer/csw/csw.mapper";
import {DcatMapper} from "../../../importer/dcat/dcat.mapper";
import {ExcelMapper} from "../../../importer/excel/excel.mapper";
import {OaiMapper} from "../../../importer/oai/oai.mapper";
import {SparqlMapper} from "../../../importer/sparql/sparql.mapper";
import {BaseMapper} from "../../../importer/base.mapper";
import {DiplanungMapper} from "./diplanung.mapper";
import {ExcelSparseMapper} from "../../../importer/excelsparse/excelsparse.mapper";
import {WfsMapper} from "../../../importer/wfs/wfs.mapper";

export class DiplanungMapperFactory {
    static getMapper(mapper) : DiplanungMapper<any> {
        switch (mapper.constructor.name) {
            case 'CswMapper': return new DiplanungMapper(mapper)
            case 'ExcelSparseMapper': return new DiplanungMapper(mapper)
            case 'WfsMapper': return new DiplanungMapper(mapper)
        }
    }
}