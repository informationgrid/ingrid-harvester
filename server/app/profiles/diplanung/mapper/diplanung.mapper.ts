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

import 'dayjs/locale/de';
import { getLogger } from 'log4js';
import { Contact, Organization, Person } from '../../../model/agent';
import { DateRange } from '../../../model/dateRange';
import { DiplanungCswMapper } from './diplanung.csw.mapper';
import { DiplanungVirtualMapper } from './diplanung.virtual.mapper';
import { Distribution } from "../../../model/distribution";
import { ExcelSparseMapper } from "../../../importer/excelsparse/excelsparse.mapper";
import { PluPlanState, PluPlanType, PluProcedureState, PluProcedureType, ProcessStep } from 'model/dcatApPlu.model';
import { WfsMapper } from "../../../importer/wfs/wfs.mapper";
import { DcatappluMapper } from "../../../importer/dcatapplu/dcatapplu.mapper";

const dayjs = require('dayjs');
dayjs.locale('de');

export class DiplanungMapper<M extends DiplanungCswMapper | DiplanungVirtualMapper| ExcelSparseMapper | WfsMapper | DcatappluMapper > {

    protected baseMapper: M;

    private _log = getLogger();

    constructor(baseMapper: M) {
        this.baseMapper = baseMapper;
    }

    async getContactPoint(): Promise<Contact> {
        return await this.baseMapper.getContactPoint();
    }

    getDescription(): string {
        return this.baseMapper.getDescription();
    }

    getGeneratedId(): string {
        return this.baseMapper.getGeneratedId();
    }

    getAdmsIdentifier(): string {
        return this.baseMapper._getAdmsIdentifier();
    }

    getTitle(): string {
        return this.baseMapper.getTitle();
    }

    getAlternateTitle(): string {
        return this.baseMapper._getAlternateTitle();
    }

    getPluPlanState(): PluPlanState {
        return this.baseMapper._getPluPlanState();
    }

    getTemporal(): DateRange[] {
        return this.baseMapper.getTemporal();
    }

    getPluDevelopmentFreezePeriod(): DateRange {
        return this.baseMapper._getPluDevelopmentFreezePeriod();
    }

    getPluProcedureStartDate(): Date {
        return this.baseMapper._getPluProcedureStartDate();
    }

    getPluPlanType(): PluPlanType {
        return this.baseMapper._getPluPlanType();
    }

    getPluPlanTypeFine(): string {
        return this.baseMapper._getPluPlanTypeFine();
    }

    getPluProcedureState(): PluProcedureState {
        return this.baseMapper._getPluProcedureState();
    }

    getPluProcedureType(): PluProcedureType {
        return this.baseMapper._getPluProcedureType();
    }

    getPluProcessSteps(): ProcessStep[] {
        return this.baseMapper._getPluProcessSteps();
    }

    getPluNotification(): string {
        return this.baseMapper._getPluNotification();
    }

    getBoundingBox(): object {
        return this.baseMapper._getBoundingBox();
    }

    getCentroid(): object {
        return this.baseMapper._getCentroid();
    }

    getSpatial(): object {
        return this.baseMapper.getSpatial();
    }

    getSpatialText(): string {
        return this.baseMapper.getSpatialText();
    }

    getPublisher(): Promise<Person[] | Organization[]> {
        return this.baseMapper.getPublisher();
    }

    getMaintainers(): Promise<Person[] | Organization[]> {
        return this.baseMapper.getMaintainers();
    }

    getContributors(): Promise<Person[] | Organization[]> {
        return this.baseMapper.getContributors();
    }

    getDistributions(): Promise<Distribution[]> {
        return this.baseMapper.getDistributions();
    }

    getRelation(): string {
        return this.baseMapper._getRelation();
    }

    getHarvestedData(): string {
        return this.baseMapper.getHarvestedData();
    }

    getMetadataHarvested(): Date {
        return this.baseMapper.getMetadataHarvested();
    }

    getMetadataIssued(): Date {
        return this.baseMapper.getMetadataIssued();
    }

    getMetadataModified(): Date {
        return this.baseMapper.getMetadataModified();
    }

    getMetadataSource(): string {
        return this.baseMapper.getMetadataSource();
    }

    getHierarchyLevel() {
        return this.baseMapper.getHierarchyLevel();
    }

    getOperatesOn() {
        return this.baseMapper.getOperatesOn();
    }

    getIssued(): Date {
        return this.baseMapper.getIssued();
    }

    getKeywords(): string[] {
        return this.baseMapper.getKeywords();
    }

    getModifiedDate(): Date {
        return this.baseMapper.getModifiedDate();
    }

    getCatalog() {
        return this.baseMapper._getCatalog();
    }

    getHarvestErrors(): string[] {
        return this.baseMapper.getHarvestErrors();
    }

    isValid(doc? : any): boolean {
        return this.baseMapper.isValid(doc) && doc.spatial_text != null && (doc.spatial != null || doc.bounding_box != null);
    }

    getQualityNotes(doc? : any): string[] {
        return this.baseMapper.getQualityNotes();
    }

    executeCustomCode(doc: any) {
        this.baseMapper.executeCustomCode(doc);
    }
}
