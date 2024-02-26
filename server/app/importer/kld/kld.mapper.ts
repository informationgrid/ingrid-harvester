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

/**
 * A mapper for documents harvested from KuLaDig.
 */
import { License } from '@shared/license.model';
import { ImporterSettings } from 'importer.settings';
import { Person, Organization, Contact, Agent } from 'model/agent';
import { DateRange } from 'model/dateRange';
import { Distribution } from 'model/distribution';
import { Summary } from 'model/summary';
import { RequestOptions } from 'utils/http-request.utils';
import { BaseMapper } from '../../importer/base.mapper';
import { KldSettings } from './kld.settings';
import { ObjectResponse } from './kld.api';
import { getLogger } from 'log4js';

export class KldMapper extends BaseMapper {

    private log = getLogger();

    private readonly record: ObjectResponse;
    private readonly id: string;

    private settings: KldSettings;
    private harvestTime: Date;
    private summary: Summary;

    constructor(settings: KldSettings, record: ObjectResponse, harvestTime: Date, summary: Summary) {
        super();
        this.settings = settings;
        this.record = record;
        this.harvestTime = harvestTime;
        this.summary = summary;
        this.id = record.Id;

        super.init();
    }

    public getSettings(): ImporterSettings {
        return this.settings;
    }

    public getSummary(): Summary {
        return this.summary;
    }

    _getTitle(): string {
        const title = this.record.Name;
        return title && title.trim() !== '' ? title : undefined;
    }

    _getDescription(): string {
        const abstract = this.record.Beschreibung;
        if (!abstract) {
          let msg = `Dataset doesn't have an abstract. It will not be displayed in the portal. Id: \'${this.id}\', title: \'${this.getTitle()}\', source: \'${this.settings.providerUrl}\'`;
          this.log.warn(msg);
          this.summary.warnings.push(['No description', msg]);
          this.valid = false;
      }
      return abstract;
    }

    async _getContactPoint(): Promise<Contact> {
        const contact: Contact = {
            fn: this.record.Datenherkunft?.Name,
            hasURL: this.record.Datenherkunft?.Url,
        };
        return new Promise((resolve) => resolve(contact));
    }

    _getGeneratedId(): string {
        return this.id;
    }

    _getSpatial() {
        return this.record.Polygon;
    }

    _getSpatialText(): string {
        return this.record.Adresse;
    }

    async _getPublisher(): Promise<Person[] | Organization[]> {
        const publisher: Person = {
            name: this.record.Datenherkunft?.Name,
        };
        return new Promise((resolve) => resolve([publisher]));
    }

    async _getDistributions(): Promise<Distribution[]> {
      return new Promise((resolve) => resolve([]));
    }

    _getMetadataHarvested(): Date {
        return new Date(Date.now());
    }

    _getMetadataSource() {
        let link = `${this.settings.providerUrl}/Objekt/${this.id}`;
        return {
            source_base: this.settings.providerUrl,
            raw_data_source: link,
            portal_link: this.settings.defaultAttributionLink,
            attribution: this.settings.defaultAttribution
        };
    }

    _getIssued(): Date {
        return undefined;
    }

    _getKeywords(): string[] {
        return Object.values(this.record.Schlagwoerter);
    }

    _getModifiedDate(): Date {
        return new Date(this.record.ZuletztGeaendert);
    }

    _getHarvestedData(): string {
        return JSON.stringify(this.record);
    }

    // TODO implement if needed

    _getThemes(): string[] {
        throw new Error('Method not implemented.');
    }
    _getAccessRights(): string[] {
        throw new Error('Method not implemented.');
    }
    _isRealtime(): boolean {
        throw new Error('Method not implemented.');
    }
    _getTemporal(): DateRange[] {
        throw new Error('Method not implemented.');
    }
    _getCitation(): string {
        throw new Error('Method not implemented.');
    }
    _getAccrualPeriodicity(): string {
        throw new Error('Method not implemented.');
    }
    _getCreator(): Person | Person[] {
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
}
