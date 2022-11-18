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

import { DcatApPluDocument } from "./dcatApPlu.document";
import { GenericMapper } from "./generic.mapper";

export class IndexDocument {

    static async create(mapper: GenericMapper) : Promise<any> {
        let result = await {
            // basic information
            contact_point: await mapper.getContactPoint(),
            description: mapper.getDescription(),
            identifier: mapper.getGeneratedId(),
            title: mapper.getTitle(),
            // plan and procedure information
            planState: mapper.getPluPlanState(),
            plan_or_procedure_start: mapper.getTemporal()?.[0]?.gte ?? mapper.getPluProcedureStartDate(),
            planType: mapper.getPluPlanType(),
            planTypeFine: mapper.getPluPlanTypeFine(),
            procedureState: mapper.getPluProcedureState(),
            procedureStartDate: mapper.getPluProcedureStartDate(),
            procedureType: mapper.getPluProcedureType(),
            processSteps: mapper.getPluProcessSteps(),
            // spatial and temporal features
            centroid: mapper.getCentroid(),
            spatial: mapper.getSpatial(),
            spatial_text: mapper.getSpatialText(),
            temporal: mapper.getTemporal(),
            // additional information and metadata
            publisher: await mapper.getPublisher(),
            distribution: await mapper.getDistributions(),
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
                    [DcatApPluDocument.getExportFormat()]: await DcatApPluDocument.create(mapper),
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
