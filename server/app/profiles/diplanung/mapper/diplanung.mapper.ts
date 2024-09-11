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

import { createEsId } from '../diplanung.utils';
import { Catalog, PluPlanState, PluPlanType, PluProcedureState, PluProcedureType, ProcessStep } from '../../../model/dcatApPlu.model';
import { Contact, Organization, Person } from '../../../model/agent';
import { CswMapper } from '../../../importer/csw/csw.mapper';
import { DateRange } from '../../../model/dateRange';
import { DiplanungIndexDocument } from '../model/index.document';
import { DcatappluMapper } from '../../../importer/dcatapplu/dcatapplu.mapper';
import { Distribution } from '../../../model/distribution';
import { Geometries, Geometry, GeometryCollection, Point } from '@turf/helpers';
import { IndexDocumentFactory } from '../../../model/index.document.factory';
import { WfsMapper } from '../../../importer/wfs/wfs.mapper';

export abstract class DiplanungMapper<M extends CswMapper | DcatappluMapper | WfsMapper> implements IndexDocumentFactory<DiplanungIndexDocument> {

    protected baseMapper: M;

    constructor(baseMapper: M) {
        this.baseMapper = baseMapper;
    }

    async create(): Promise<DiplanungIndexDocument> {
        let contactPoint: Contact = await this.getContactPoint() ?? { fn: '' };
        let result: DiplanungIndexDocument = {
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
            description: this.getDescription(),
            identifier: this.getUuid(),
            adms_identifier: this.getAdmsIdentifier(),
            // resource_identifier: mapper.getResourceIdentifier(),
            title: this.getTitle(),
            // plan and procedure information
            development_freeze_period: this.getPluDevelopmentFreezePeriod(),
            plan_name: this.getPluPlanName(),
            plan_or_procedure_start_date: this.getPluProcedurePeriod()?.gte,
            plan_state: this.getPluPlanState(),
            plan_type: this.getPluPlanType(),
            plan_type_fine: this.getPluPlanTypeFine(),
            procedure_state: this.getPluProcedureState(),
            procedure_start_date: this.getPluProcedurePeriod()?.gte,
            procedure_period: this.getPluProcedurePeriod(),
            procedure_type: this.getPluProcedureType(),
            process_steps: this.getPluProcessSteps(),
            notification: this.getPluNotification(),
            // spatial features
            bounding_box: this.getBoundingBox(),
            centroid: this.getCentroid()?.['coordinates'],
            spatial: this.getSpatial(),
            spatial_text: this.getSpatialText(),
            // additional information and metadata
            relation: this.getRelation(),
            catalog: await this.getCatalog(),
            publisher: (await this.getPublisher())?.[0],
            maintainers: await this.getMaintainers(),
            contributors: await this.getContributors(),
            distributions: await this.getDistributions(),
            extras: {
                // harvested_data: mapper.getHarvestedData(),
                hierarchy_level: this.getHierarchyLevel(),    // only csw
                metadata: {
                    harvested: this.baseMapper.getHarvestingDate(),
                    harvesting_errors: null, // get errors after all operations been done
                    issued: null,
                    is_valid: null, // check validity before persisting to ES
                    modified: null,
                    source: this.baseMapper.getMetadataSource(),
                    merged_from: []
                }
            },
            issued: this.getIssued(),
            modified: this.getModifiedDate(),
        };

        result.extras.metadata.merged_from.push(createEsId(result));
        result.extras.metadata.harvesting_errors = this.baseMapper.getHarvestingErrors();
        // result.extras.metadata.is_valid = mapper.isValid(result);
        // let qualityNotes = mapper.getQualityNotes();
        // if (qualityNotes?.length > 0) {
        //     result.extras.metadata['quality_notes'] = qualityNotes;
        // }
        this.baseMapper.executeCustomCode(result);

        return result;
    }

    abstract getContactPoint(): Promise<Contact>;

    abstract getDescription(): string;

    abstract getUuid(): string;

    abstract getAdmsIdentifier(): string;

    abstract getTitle(): string;

    abstract getPluDevelopmentFreezePeriod(): DateRange;

    abstract getPluPlanName(): string;

    abstract getPluPlanState(): PluPlanState;

    abstract getPluPlanType(): PluPlanType;

    abstract getPluPlanTypeFine(): string;

    abstract getPluProcedurePeriod(): DateRange;

    abstract getPluProcedureState(): PluProcedureState;

    abstract getPluProcedureType(): PluProcedureType;

    abstract getPluProcessSteps(): ProcessStep[];

    abstract getPluNotification(): string;

    // spatial features
    abstract getBoundingBox(): Geometry | GeometryCollection;

    abstract getCentroid(): Point;

    abstract getSpatial(): Geometries | Geometry | GeometryCollection;

    abstract getSpatialText(): string;

    // additional information and metadata
    abstract getRelation(): string;

    abstract getCatalog(): Promise<Catalog>;

    abstract getPublisher(): Promise<Person[] | Organization[]>;

    abstract getMaintainers(): Promise<Person[] | Organization[]>;

    abstract getContributors(): Promise<Person[] | Organization[]>;

    abstract getDistributions(): Promise<Distribution[]>;

    abstract getIssued(): Date;

    abstract getModifiedDate(): Date;

    getHierarchyLevel() {
        return undefined;
    }

    getOperatesOn() {
        return undefined;
    }


    // -----------------------------


    // async getContactPoint(): Promise<Contact> {
    //     return await this.baseMapper.getContactPoint();
    // }

    // getDescription(): string {
    //     return this.baseMapper.getDescription();
    // }

    // getGeneratedId(): string {
    //     return this.baseMapper.getGeneratedId();
    // }

    // getAdmsIdentifier(): string {
    //     return this.baseMapper.getAdmsIdentifier();
    // }

    // getTitle(): string {
    //     return this.baseMapper.getTitle();
    // }

    // getAlternateTitle(): string {
    //     return this.baseMapper.getAlternateTitle();
    // }

    // getBoundingBox(): object {
    //     return this.baseMapper.getBoundingBox();
    // }

    // getCentroid(): object {
    //     return this.baseMapper.getCentroid();
    // }

    // getSpatial(): object {
    //     return this.baseMapper.getSpatial();
    // }

    // getSpatialText(): string {
    //     return this.baseMapper.getSpatialText();
    // }

    // getPublisher(): Promise<Person[] | Organization[]> {
    //     return this.baseMapper.getPublisher();
    // }

    // getMaintainers(): Promise<Person[] | Organization[]> {
    //     return this.baseMapper.getMaintainers();
    // }

    // getContributors(): Promise<Person[] | Organization[]> {
    //     return this.baseMapper.getContributors();
    // }

    // getDistributions(): Promise<Distribution[]> {
    //     return this.baseMapper.getDistributions();
    // }

    // getRelation(): string {
    //     return this.baseMapper.getRelation();
    // }

    // getHarvestedData(): string {
    //     return this.baseMapper.getHarvestedData();
    // }

    // getMetadataHarvested(): Date {
    //     return this.baseMapper.getMetadataHarvested();
    // }

    // getMetadataSource(): any {
    //     return this.baseMapper.getMetadataSource();
    // }

    // getHierarchyLevel() {
    //     return this.baseMapper.getHierarchyLevel();
    // }

    // getOperatesOn() {
    //     return this.baseMapper.getOperatesOn();
    // }

    // getIssued(): Date {
    //     return this.baseMapper.getIssued();
    // }

    // getKeywords(): string[] {
    //     return this.baseMapper.getKeywords();
    // }

    // getModifiedDate(): Date {
    //     return this.baseMapper.getModifiedDate();
    // }

    // getCatalog() {
    //     return this.baseMapper.getCatalog();
    // }

    // getHarvestErrors(): string[] {
    //     return this.baseMapper.getHarvestErrors();
    // }

    // isValid(doc? : any): boolean {
    //     return this.baseMapper.isValid(doc) && doc.spatial_text != null && (doc.spatial != null || doc.bounding_box != null);
    // }

    // getQualityNotes(doc? : any): string[] {
    //     return this.baseMapper.getQualityNotes();
    // }

    executeCustomCode(doc: any) {
        this.baseMapper.executeCustomCode(doc);
    }
}
