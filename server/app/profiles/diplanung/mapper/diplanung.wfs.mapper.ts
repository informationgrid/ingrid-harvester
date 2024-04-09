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

import { Catalog, PluPlanState, PluPlanType, PluProcedureState, PluProcedureType, ProcessStep } from '../../../model/dcatApPlu.model';
import { Contact, Organization, Person } from '../../../model/agent';
import { DateRange } from '../../../model/dateRange';
import { DiplanungMapper } from './diplanung.mapper';
import { Distribution } from '../../../model/distribution';
import { Geometries, Geometry, GeometryCollection, Point } from '@turf/helpers';
import { WfsMapper } from '../../../importer/wfs/wfs.mapper';

const alternateTitleBlacklist = ['B-Plan', 'F-Plan'];

export class DiplanungWfsMapper extends DiplanungMapper<WfsMapper> {

    constructor(baseMapper: WfsMapper) {
        super(baseMapper);
    }

    async getContactPoint(): Promise<Contact> {
        return this.baseMapper.getContactPoint();
    }

    getDescription(): string {
        return this.baseMapper.getDescription();
    }

    getUuid(): string {
        return this.baseMapper.getGeneratedId();
    }

    getAdmsIdentifier(): string {
        return this.baseMapper.getAdmsIdentifier();
    }

    getTitle(): string {
        return this.baseMapper.getTitle();
    }

    getPluDevelopmentFreezePeriod(): DateRange {
        return this.baseMapper.getPluDevelopmentFreezePeriod();
    }

    getPluPlanName(): string {
        return this.baseMapper.getPlanName();
    }

    getPluPlanState(): PluPlanState {
        return this.baseMapper.getPluPlanState();
    }

    getPluPlanType(): PluPlanType {
        return this.baseMapper.getPluPlanType();
    }

    getPluPlanTypeFine(): string {
        return this.baseMapper.getPluPlanTypeFine();
    }

    getPluProcedurePeriod(): DateRange {
        return this.baseMapper.getPluProcedurePeriod();
    }

    getPluProcedureState(): PluProcedureState {
        return this.baseMapper.getPluProcedureState();
    }

    getPluProcedureType(): PluProcedureType {
        return this.baseMapper.getPluProcedureType();
    }

    getPluProcessSteps(): ProcessStep[] {
        return this.baseMapper.getPluProcessSteps();
    }

    getPluNotification(): string {
        return undefined;
    }

    getRelation(): string {
        return undefined;
    }

    getBoundingBox(): Geometry {
        return this.baseMapper.getBoundingBox();
    }

    getCentroid(): Point {
        return this.baseMapper.getCentroid();
    }

    getSpatial(): Geometry | GeometryCollection {
        return this.baseMapper.getSpatial();
    }

    getSpatialText(): string {
        return this.baseMapper.getSpatialText();
    }

    async getCatalog(): Promise<Catalog> {
        return this.baseMapper.getCatalog();
    }

    async getPublisher(): Promise<Person[] | Organization[]> {
        return this.baseMapper.getPublisher();
    }

    async getMaintainers(): Promise<Person[] | Organization[]> {
        return this.baseMapper.getMaintainers();
    }

    async getContributors(): Promise<Person[] | Organization[]> {
        return this.baseMapper.getContributors();
    }

    async getDistributions(): Promise<Distribution[]> {
        return this.baseMapper.getDistributions();
    }

    getIssued(): Date {
        return this.baseMapper.getIssued();
    }

    getModifiedDate(): Date {
        return this.baseMapper.getModifiedDate();
    }
}
