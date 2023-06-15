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
import { getLogger } from "log4js";
import { Contact, Organization, Person } from "../../../model/agent";
import { DateRange } from "../../../model/dateRange";
import { DiplanungCswMapper } from './diplanung.csw.mapper';
import { DiplanungVirtualMapper } from './diplanung.virtual.mapper';
import { Distribution } from "../../../model/distribution";
import { ExcelSparseMapper } from "../../../importer/excelsparse/excelsparse.mapper";
import { WfsMapper } from "../../../importer/wfs/wfs.mapper";

const dayjs = require('dayjs');
dayjs.locale('de');

export class DiplanungMapper<M extends DiplanungCswMapper | DiplanungVirtualMapper| ExcelSparseMapper | WfsMapper> {

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

    getTitle(): string {
        return this.baseMapper.getTitle();
    }

    getAlternateTitle(): string {
        return this.baseMapper._getAlternateTitle();
    }

    getPluPlanState(): string {
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

    getPluPlanType(): string {
        return this.baseMapper._getPluPlanType();
    }

    getPluPlanTypeFine(): string {
        return this.baseMapper._getPluPlanTypeFine();
    }

    getPluProcedureState(): string {
        return this.baseMapper._getPluProcedureState();
    }

    getPluProcedureType(): string {
        return this.baseMapper._getPluProcedureType();
    }

    getPluProcessSteps(): string {
        return this.baseMapper._getPluProcessSteps();
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

    getDistributions(): Promise<Distribution[]> {
        return this.baseMapper.getDistributions();
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
        return this.baseMapper.isValid(doc)
    }

    executeCustomCode(doc: any) {
        this.baseMapper.executeCustomCode(doc)
    }
}


