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

import { Agent, Contact, Organization, Person } from '../../../model/agent';
import { BaseMapper } from '../../../importer/base.mapper';
import { Catalog } from '../../../model/dcatApPlu.model';
import { DateRange } from '../../../model/dateRange';
import { Distribution } from '../../../model/distribution';
import { ImporterSettings } from '../../../importer.settings';
import { License } from '@shared/license.model';
import { RequestOptions } from '../../../utils/http-request.utils';
import { Summary } from '../../../model/summary';

export class DiplanungVirtualMapper extends BaseMapper {

    private fields;

    constructor(fields) {
        super();
        this.fields = fields;
    }

    _getCatalog(): Catalog {
        return this.fields.catalog;
    }

    _getTitle(): string {
        return this.fields.title;
    }

    _getAlternateTitle(): string {
        return this.fields.alternateTitle;
    }

    _getDescription(): string {
        return this.fields.description;
    }

    async _getPublisher(): Promise<Person[] | Organization[]> {
        return [this.fields.publisher];
    }

    _getMaintainers(): Promise<Person[] | Organization[]> {
        return this.fields.maintainers;
    }

    async _getContributors(): Promise<Person[] | Organization[]> {
        return undefined
    }

    _getModifiedDate(): Date {
        return this.fields.modified;
    }

    getDistributions(): Promise<Distribution[]> {
        return this.fields.distributions;
    }

    _getGeneratedId(): string {
        return this.fields.identifier;
    }

    _getSpatial(): object {
        return this.fields.spatial;
    }

    _getBoundingBox(): object {
        return this.fields.bounding_box;
    }

    _getCentroid(): object {
        return this.fields.centroid;
    }

    _getSpatialText(): string {
        return this.fields.spatial_text;
    }

    _getTemporal(): DateRange[] {
        throw new Error('Method not implemented.');
    }

    async _getContactPoint(): Promise<Contact> {
        return await {
            fn: this.fields.contact_point.fn,
            hasOrganizationName: this.fields.contact_point.has_organization_name,
            hasPostalCode: this.fields.contact_point.has_postal_code,
            hasStreetAddress: this.fields.contact_point.has_street_address,
            hasLocality: this.fields.contact_point.has_locality,
            hasRegion: this.fields.contact_point.has_region,
            hasCountryName: this.fields.contact_point.has_country_name,
            hasEmail: this.fields.contact_point.has_email,
            hasTelephone: this.fields.contact_point.has_telephone
        };
    }

    _getIssued(): Date {
        return this.fields.issued;
    }

    _getPluDevelopmentFreezePeriod() {
        return this.fields.development_freeze_period;
    }

    _getPluPlanState(): string {
        return this.fields.plan_state;
    }

    _getPluPlanType(): string {
        return this.fields.plan_type;
    }

    _getPluPlanTypeFine() {
        return this.fields.plan_type_fine;
    }

    _getPluProcedureStartDate(): Date {
        return this.fields.procedure_start_date;
    }

    _getPluProcedureState(): string {
        return this.fields.procedure_state;
    }

    _getPluProcedureType() {
        return this.fields.procedure_type;
    }

    _getPluProcessSteps() {
        return this.fields.process_steps;
    }

    _getPluNotification() {
        return this.fields.notification;
    }

    _getAdmsIdentifier() {
        return this.fields.adms_identifier;
    }

    _getRelation() {
        return this.fields.relation;
    }


    public getSettings(): ImporterSettings {
        throw new Error('Method not implemented.');
    }
    public getSummary(): Summary {
        throw new Error('Method not implemented.');
    }
    _getThemes(): string[] {
        throw new Error('Method not implemented.');
    }
    _getAccessRights(): string[] {
        throw new Error('Method not implemented.');
    }
    _getDistributions(): Promise<Distribution[]> {
        throw new Error('Method not implemented.');
    }
    _getMetadataModified(): Date {
        throw new Error('Method not implemented.');
    }
    _getMetadataSource() {
        throw new Error('Method not implemented.');
    }
    _getMetadataIssued(): Date {
        throw new Error('Method not implemented.');
    }
    _isRealtime(): boolean {
        throw new Error('Method not implemented.');
    }
    _getCitation(): string {
        throw new Error('Method not implemented.');
    }
    _getKeywords(): string[] {
        throw new Error('Method not implemented.');
    }
    _getAccrualPeriodicity(): string {
        throw new Error('Method not implemented.');
    }
    _getCreator(): Person | Person[] {
        throw new Error('Method not implemented.');
    }
    _getHarvestedData(): string {
        throw new Error('Method not implemented.');
    }
    _getMetadataHarvested(): Date {
        throw new Error('Method not implemented.');
    }
    _getSubSections(): any[] {
        throw new Error('Method not implemented.');
    }
    _getGroups(): string[] {
        throw new Error('Method not implemented.');
    }
    _getOriginator(): Agent[] {
        throw new Error('Method not implemented.');
    }
    _getLicense(): Promise<License> {
        throw new Error('Method not implemented.');
    }
    _getUrlCheckRequestConfig(uri: string): RequestOptions {
        throw new Error('Method not implemented.');
    }
    _getRelation() {
        return undefined;
    }
    _getAdmsIdentifier(){
        return undefined;
    }
    _getPluNotification(){
        return undefined;
    }
}