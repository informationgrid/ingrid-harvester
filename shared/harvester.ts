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

import { CkanSettings } from '../server/app/importer/ckan/ckan.settings';
import { CswSettings } from '../server/app/importer/csw/csw.settings';
import { DcatSettings } from '../server/app/importer/dcat/dcat.settings';
import { ExcelSettings } from '../server/app/importer/excel/excel.settings';
import { ExcelSparseSettings } from '../server/app/importer/excelsparse/excelsparse.settings';
import { KldSettings } from '../server/app/importer/kld/kld.settings';
import { OaiSettings } from '../server/app/importer/oai/oai.settings';
import { SparqlSettings } from '../server/app/importer/sparql/sparql.settings';
import { WfsSettings } from '../server/app/importer/wfs/wfs.settings';

export type Harvester = CkanSettings | CswSettings | DcatSettings | ExcelSettings | ExcelSparseSettings | OaiSettings | SparqlSettings | WfsSettings | KldSettings;