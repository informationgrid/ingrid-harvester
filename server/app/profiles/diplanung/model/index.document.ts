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

import { Contact } from '../../../model/agent';
import { CswMapper } from '../../../importer/csw/csw.mapper';
import { DcatApPluDocument } from './dcatApPlu.document';
import { DiplanungMapperFactory } from '../mapper/diplanung.mapper.factory';
import { ExcelSparseMapper } from '../../../importer/excelsparse/excelsparse.mapper';
import { IndexDocument } from '../../../model/index.document';
import { WfsMapper } from '../../../importer/wfs/wfs.mapper';

export class DiPlanungDocument extends IndexDocument<CswMapper | ExcelSparseMapper | WfsMapper> {

    async create(_mapper: CswMapper | ExcelSparseMapper | WfsMapper) : Promise<any> {
        let mapper = DiplanungMapperFactory.getMapper(_mapper);
        let contactPoint: Contact = await mapper.getContactPoint();
        let result = {
            // basic information
            contact_point: {
                fn: contactPoint.fn,
                has_country_name: contactPoint.hasCountryName,
                has_locality: contactPoint.hasLocality,
                has_postal_code: contactPoint.hasPostalCode,
                has_region: contactPoint.hasRegion,
                has_street_address: contactPoint.hasStreetAddress,
                has_email: contactPoint.hasEmail,
                has_telephone: contactPoint.hasTelephone,
                has_uid: contactPoint.hasUID,
                has_url: contactPoint.hasURL,
                has_orgnaization_name: contactPoint.hasOrganizationName
            },
            description: mapper.getDescription(),
            identifier: mapper.getGeneratedId(),
            title: mapper.getTitle(),
            // plan and procedure information
            plan_state: mapper.getPluPlanState(),
            plan_or_procedure_start_date: mapper.getTemporal()?.[0]?.gte ?? mapper.getPluProcedureStartDate(),
            plan_type: mapper.getPluPlanType(),
            plan_type_fine: mapper.getPluPlanTypeFine(),
            procedure_state: mapper.getPluProcedureState(),
            procedure_start_date: mapper.getPluProcedureStartDate(),
            procedure_type: mapper.getPluProcedureType(),
            process_steps: mapper.getPluProcessSteps(),
            // spatial and temporal features
            centroid: mapper.getCentroid(),
            spatial: mapper.getSpatial(),
            spatial_text: mapper.getSpatialText(),
            temporal: mapper.getTemporal(),
            // additional information and metadata
            publisher: (await mapper.getPublisher())?.[0],
            distributions: await mapper.getDistributions(),
            extras: {
                harvested_data: mapper.getHarvestedData(),
                metadata: {
                    harvested: mapper.getMetadataHarvested(),
                    harvesting_errors: null, // get errors after all operations been done
                    issued: mapper.getMetadataIssued(),
                    is_valid: null, // checks validity after all operations been done
                    modified: mapper.getMetadataModified(),
                    source: mapper.getMetadataSource()
                },
                transformed_data: {
                    [DcatApPluDocument.getExportFormat()]: await DcatApPluDocument.create(_mapper),
                }
            },
            issued: mapper.getIssued(),
            keywords: mapper.getKeywords(),
            modified: mapper.getModifiedDate(),
        };

        result.extras.metadata.harvesting_errors = mapper.getHarvestErrors();
        result.extras.metadata.is_valid = mapper.isValid(result);
        mapper.executeCustomCode(result);

        return result;
    }
}
