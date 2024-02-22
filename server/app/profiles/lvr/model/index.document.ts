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

import { OaiMapper } from '../../../importer/oai/lido/oai.mapper';
import { Contact, Organization, Person } from '../../../model/agent';
import { Distribution } from '../../../model/distribution';
import { IndexDocument } from '../../../model/index.document';
import { createEsId } from '../lvr.utils';
import { LvrMapperFactory } from '../mapper/lvr.mapper.factory';
import { Event, Record, Relation, Repository, Resource, Subject } from '../../../importer/oai/lido/lido.model';

export class LvrDocument extends IndexDocument<OaiMapper> {

    async create(_mapper: OaiMapper) : Promise<LvrIndexDocument> {
        let mapper = LvrMapperFactory.getMapper(_mapper);
        // let contactPoint: Contact = await mapper.getContactPoint() ?? { fn: '' };
        let result = {
            // // basic information
            // contact_point: {
            //     fn: contactPoint.fn,
            //     has_country_name: contactPoint.hasCountryName,
            //     has_locality: contactPoint.hasLocality,
            //     has_postal_code: contactPoint.hasPostalCode,
            //     has_region: contactPoint.hasRegion,
            //     has_street_address: contactPoint.hasStreetAddress,
            //     has_email: contactPoint.hasEmail,
            //     has_telephone: contactPoint.hasTelephone,
            //     has_uid: contactPoint.hasUID,
            //     has_url: contactPoint.hasURL,
            //     has_organization_name: contactPoint.hasOrganizationName
            // },
            // description: mapper.getDescription(),
            // identifier: mapper.getGeneratedId(),
            // // adms_identifier: mapper.getAdmsIdentifier(),
            // // resource_identifier: mapper.getResourceIdentifier(),
            // title: mapper.getTitle(),
            // // plan_name: mapper.getAlternateTitle(),
            // // plan and procedure information
            // // development_freeze_period: mapper.getPluDevelopmentFreezePeriod(),
            // // plan_state: mapper.getPluPlanState(),
            // // plan_or_procedure_start_date: mapper.getTemporal()?.[0]?.gte ?? mapper.getPluProcedureStartDate(),
            // // plan_type: mapper.getPluPlanType(),
            // // plan_type_fine: mapper.getPluPlanTypeFine(),
            // // procedure_state: mapper.getPluProcedureState(),
            // // procedure_start_date: mapper.getPluProcedureStartDate(),
            // // procedure_type: mapper.getPluProcedureType(),
            // // process_steps: mapper.getPluProcessSteps(),
            // // notification: mapper.getPluNotification(),
            // // spatial and temporal features
            // // bounding_box: mapper.getBoundingBox(),
            // // centroid: mapper.getCentroid()?.['coordinates'],
            // spatial: mapper.getSpatial(),
            // spatial_text: mapper.getSpatialText(),
            // // temporal: mapper.getTemporal(),
            // // additional information and metadata
            // // relation: mapper.getRelation(),
            // // catalog: await mapper.getCatalog(),
            // publisher: (await mapper.getPublisher())?.[0],
            // maintainers: await mapper.getMaintainers(),
            // contributors: await mapper.getContributors(),
            // distributions: await mapper.getDistributions(),
            // extras: {
            //     // harvested_data: mapper.getHarvestedData(),
            //     hierarchy_level: mapper.getHierarchyLevel(),    // only csw
            //     metadata: {
            //         harvested: mapper.getMetadataHarvested(),
            //         harvesting_errors: null, // get errors after all operations been done
            //         issued: null,
            //         is_valid: null, // check validity before persisting to ES
            //         modified: null,
            //         source: mapper.getMetadataSource()
            //     },
            //     operates_on: mapper.getOperatesOn(),    // only csw
            //     merged_from: []
            // },
            // issued: mapper.getIssued(),
            // keywords: mapper.getKeywords(),
            // modified: mapper.getModifiedDate(),
            events: mapper.getEvents(),
            records: mapper.getRecord(),
            relations: mapper.getRelations(),
            repositories: mapper.getRepositories(),
            resources: mapper.getResources(),
            subjects: mapper.getSubjects()
        };

        // result.extras.merged_from.push(createEsId(result));
        // result.extras.metadata.harvesting_errors = mapper.getHarvestErrors();
        // // result.extras.metadata.is_valid = mapper.isValid(result);
        // // let qualityNotes = mapper.getQualityNotes();
        // // if (qualityNotes?.length > 0) {
        // //     result.extras.metadata['quality_notes'] = qualityNotes;
        // // }
        // mapper.executeCustomCode(result);

        return result;
    }
}

export type LvrIndexDocument = {
    events: Event[],
    records: Record,
    relations: Relation[],
    repositories: Repository[],
    resources: Resource[],
    subjects: Subject[]
    // // mandatory
    // contact_point: {
    //     fn: string,
    //     has_country_name?: string,
    //     has_locality?: string,
    //     has_postal_code?: string,
    //     has_region?: string,
    //     has_street_address?: string,
    //     has_email?: string,
    //     has_telephone?: string,
    //     has_uid?: string,
    //     has_url?: string,
    //     has_organization_name?: string
    // },
    // description: string,
    // identifier: string,
    // title: string,
    // // plan_state: PluPlanState,
    // // procedure_state: PluProcedureState,
    // publisher: Person | Organization,
    // // recommended
    // // adms_identifier: string,
    // // plan_name: string,
    // // plan_type: PluPlanType,
    // // plan_type_fine: string,
    // // procedure_type: PluProcedureType,
    // distributions: Distribution[],
    // // process_steps: ProcessStep[],
    // // bounding_box: any,
    // spatial: any,
    // // optional
    // issued: Date,
    // modified: Date,
    // // relation: string,
    // // notification: string,
    // // procedure_start_date: Date,
    // // development_freeze_period: DateRange,
    // maintainers: Person[] | Organization[],
    // contributors: Person[] | Organization[],
    // // centroid: any,
    // spatial_text: string,
    // // additional information and metadata
    // // catalog: Catalog,
    // // plan_or_procedure_start_date: Date,
    // // temporal: DateRange[],
    // extras: {
    //     hierarchy_level: string,
    //     metadata: {
    //         harvested: Date,
    //         harvesting_errors: null, // get errors after all operations been done
    //         issued: Date,
    //         is_changed?: boolean,
    //         is_valid: boolean, // checks validity after all operations been done
    //         modified: Date,
    //         quality_notes?: string[],
    //         source: {
    //             source_base: string,
    //             source_type?: string,
    //             raw_data_source?: string,
    //             portal_link?: string,
    //             attribution?: string
    //         }
    //     },
    //     operates_on: string[],
    //     merged_from: string[]
    // },
    // keywords: string[]
};
