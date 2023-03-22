/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
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

import {mcloudDocument} from "./model/index.document";
import {ProfileFactory} from "../profile.factory";
import {elasticsearchMapping} from "./elastic/elastic.mapping";
import {elasticsearchSettings} from "./elastic/elastic.settings";
import {CkanMapper} from "../../importer/ckan/ckan.mapper";
import {CswMapper} from "../../importer/csw/csw.mapper";
import {DcatMapper} from "../../importer/dcat/dcat.mapper";
import {ExcelMapper} from "../../importer/excel/excel.mapper";
import {OaiMapper} from "../../importer/oai/oai.mapper";
import {SparqlMapper} from "../../importer/sparql/sparql.mapper";
import { DeduplicateUtils } from "./elastic/deduplicate.utils";
import { ElasticQueries } from "./elastic/elastic.queries";
import { ElasticSearchUtils } from "../../utils/elastic.utils";
import { ElasticSettings } from "../../utils/elastic.setting";
import { Summary } from "../../model/summary";
import {McloudImporterFactory} from "./importer/mcloud.importer.factory";
import {ImporterFactory} from "../../importer/importer.factory";

export class mcloudFactory extends ProfileFactory<CkanMapper | CswMapper | DcatMapper | ExcelMapper | OaiMapper | SparqlMapper> {

    getIndexDocument(): mcloudDocument{
        return new mcloudDocument;
    }

    getElasticMapping(): any {
        return elasticsearchMapping;
    }

    getElasticQueries(): any {
        return ElasticQueries.getInstance();
    }

    getElasticSettings(): any {
        return elasticsearchSettings;
    }

    getDeduplicationUtils(elasticUtils: ElasticSearchUtils, elasticSettings: ElasticSettings, summary: Summary): DeduplicateUtils {
        return new DeduplicateUtils(elasticUtils, ElasticQueries.getInstance(), elasticSettings, summary);
    }

    getImporterFactory(): ImporterFactory {
        return new McloudImporterFactory();
    }
}
