/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2022 wemove digital solutions GmbH
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

import {BaseMapper} from "../../../importer/base.mapper";
import {IndexDocument} from "../../../model/index.document";
import {mcloudMapper} from "../mapper/mcloud.mapper";
import {CkanMapper} from "../../../importer/ckan/ckan.mapper";
import {CswMapper} from "../../../importer/csw/csw.mapper";
import {DcatMapper} from "../../../importer/dcat/dcat.mapper";
import {ExcelMapper} from "../../../importer/excel/excel.mapper";
import {OaiMapper} from "../../../importer/oai/oai.mapper";
import {SparqlMapper} from "../../../importer/sparql/sparql.mapper";
import {mcloudMapperFactory} from "../mapper/mcloud.mapper.factory";

export class mcloudDocument extends IndexDocument<CkanMapper | CswMapper | DcatMapper | ExcelMapper | OaiMapper | SparqlMapper>{

    async create(_mapper: CkanMapper | CswMapper | DcatMapper | ExcelMapper | OaiMapper | SparqlMapper) : Promise<any> {
        let mapper = mcloudMapperFactory.getMapper(_mapper);
        let result = await {
            priority: mapper.getPriority(),
            completion: mapper.getAutoCompletion(),
            access_rights: mapper.getAccessRights(),
            accrual_periodicity: mapper.getAccrualPeriodicity(),
            contact_point: await mapper.getContactPoint(),
            creator: mapper.getCreator(),
            description: mapper.getDescription(),
            distribution: await mapper.getDistributions(),
            extras: {
                all: mapper.getExtrasAllData(),
                citation: mapper.getCitation(),
                display_contact: await mapper.getDisplayContacts(),
                generated_id: mapper.getGeneratedId(),
                groups: mapper.getGroups(),
                harvested_data: mapper.getHarvestedData(),
                license: await mapper.getLicense(),
                metadata: {
                    harvested: mapper.getMetadataHarvested(),
                    harvesting_errors: null, // get errors after all operations been done
                    issued: mapper.getMetadataIssued(),
                    is_valid: null, // checks validity after all operations been done
                    modified: mapper.getMetadataModified(),
                    source: mapper.getMetadataSource(),
                },
                mfund_fkz: mapper.getMFundFKZ(),
                mfund_project_title: mapper.getMFundProjectTitle(),
                realtime: mapper.isRealtime(),
                subgroups: mapper.getCategories(),
                subsection: mapper.getSubSections(),
                spatial: mapper.getSpatial(),
                spatial_text: mapper.getSpatialText(),
                temporal: mapper.getTemporal(),
                parent: mapper.getParent()
            },
            issued: mapper.getIssued(),
            keywords: mapper.getKeywords(),
            modified: mapper.getModifiedDate(),
            publisher: await mapper.getPublisher(),
            originator: mapper.getOriginator(),
            theme: mapper.getThemes(),
            title: mapper.getTitle()
        };

        result.extras.metadata.harvesting_errors = mapper.getHarvestErrors();
        result.extras.metadata.is_valid = mapper.isValid(result);
        mapper.executeCustomCode(result);

        return result;
    }
}
