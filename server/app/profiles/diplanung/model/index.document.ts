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

import { Contact } from '../../../model/agent';
import { DcatApPluDocument } from './dcatApPlu.document';
import { DiplanungCswMapper } from '../mapper/diplanung.csw.mapper';
import { DiplanungMapperFactory } from '../mapper/diplanung.mapper.factory';
import { DiplanungVirtualMapper } from '../mapper/diplanung.virtual.mapper';
import { ExcelSparseMapper } from '../../../importer/excelsparse/excelsparse.mapper';
import { IndexDocument } from '../../../model/index.document';
import { WfsMapper } from '../../../importer/wfs/wfs.mapper';
import { DcatappluMapper } from "../../../importer/dcatapplu/dcatapplu.mapper";

export class DiPlanungDocument extends IndexDocument<DiplanungCswMapper | DiplanungVirtualMapper | ExcelSparseMapper | WfsMapper | DcatappluMapper> {

    async create(_mapper: DiplanungCswMapper | DiplanungVirtualMapper | ExcelSparseMapper | WfsMapper | DcatappluMapper) : Promise<any> {
        let mapper = DiplanungMapperFactory.getMapper(_mapper);
        let contactPoint: Contact = await mapper.getContactPoint() ?? { fn: '' };
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
                has_organization_name: contactPoint.hasOrganizationName
            },
            description: mapper.getDescription(),
            identifier: mapper.getGeneratedId(),
            adms_identifier: mapper.getAdmsIdentifier(),
            title: mapper.getTitle(),
            alternateTitle: mapper.getAlternateTitle(),
            // plan and procedure information
            development_freeze_period: mapper.getPluDevelopmentFreezePeriod(),
            plan_state: mapper.getPluPlanState(),
            plan_or_procedure_start_date: mapper.getTemporal()?.[0]?.gte ?? mapper.getPluProcedureStartDate(), 
            plan_type: mapper.getPluPlanType(),
            plan_type_fine: mapper.getPluPlanTypeFine(),
            procedure_state: mapper.getPluProcedureState(),
            procedure_start_date: mapper.getPluProcedureStartDate(),
            procedure_type: mapper.getPluProcedureType(),
            process_steps: mapper.getPluProcessSteps(),
            notification: mapper.getPluNotification(),
            // spatial and temporal features
            bounding_box: mapper.getBoundingBox(),
            centroid: mapper.getCentroid()?.['coordinates'],
            spatial: mapper.getSpatial(),
            spatial_text: mapper.getSpatialText(),
            temporal: mapper.getTemporal(), // already checked
            // additional information and metadata
            relation: mapper.getRelation(),
            catalog: await mapper.getCatalog(),
            publisher: (await mapper.getPublisher())?.[0],
            maintainers: await mapper.getMaintainers(),
            contributors: await mapper.getContributors(),
            distributions: await mapper.getDistributions(),
            extras: {
                harvested_data: mapper.getHarvestedData(),
                hierarchy_level: mapper.getHierarchyLevel(),    // only csw
                metadata: {
                    harvested: mapper.getMetadataHarvested(),
                    harvesting_errors: null, // get errors after all operations been done
                    issued: mapper.getMetadataIssued(),
                    is_valid: null, // checks validity after all operations been done
                    modified: mapper.getMetadataModified(),
                    source: mapper.getMetadataSource()
                },
                operates_on: mapper.getOperatesOn(),    // only csw
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
        let qualityNotes = mapper.getQualityNotes();
        if (qualityNotes?.length > 0) {
            result.extras.metadata['quality_notes'] = qualityNotes;
        }
        mapper.executeCustomCode(result);

        return result;
    }
}
