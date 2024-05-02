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
import { getLogger } from 'log4js';
import { BaseMapper } from '../../importer/base.mapper';
import { Contact, Organization, Person } from '../../model/agent';
import { DateRange } from '../../model/dateRange';
import { Distribution } from '../../model/distribution';
import { Geometries } from '@turf/helpers';
import { ImporterSettings } from '../../importer.settings';
import { KldSettings } from './kld.settings';
import { License } from '@shared/license.model';
import { ObjectResponse } from './kld.api';
import { Summary } from '../../model/summary';

export class KldMapper extends BaseMapper {

    log = getLogger();

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

    getTitle(): string {
        const title = this.record.Name;
        return title && title.trim() !== '' ? title : undefined;
    }

    getDescription(): string {
        const abstract = this.record.Beschreibung;
        if (!abstract) {
          let msg = `Dataset doesn't have an abstract. It will not be displayed in the portal. Id: \'${this.id}\', title: \'${this.getTitle()}\', source: \'${this.settings.providerUrl}\'`;
          this.log.warn(msg);
          this.summary.warnings.push(['No description', msg]);
          this.valid = false;
      }
      return abstract;
    }

    async getContactPoint(): Promise<Contact> {
        const contact: Contact = {
            fn: this.record.Datenherkunft?.Name,
            hasURL: this.record.Datenherkunft?.Url,
        };
        return new Promise((resolve) => resolve(contact));
    }

    getGeneratedId(): string {
        return this.id;
    }

    getSpatial(): Geometries {
        return this.record.Polygon;
    }

    getSpatialText(): string {
        return this.record.Adresse;
    }

    async getPublisher(): Promise<Person[] | Organization[]> {
        const publisher: Person = {
            name: this.record.Datenherkunft?.Name,
        };
        return new Promise((resolve) => resolve([publisher]));
    }

    async getDistributions(): Promise<Distribution[]> {
      return new Promise((resolve) => resolve([]));
    }

    getHarvestingDate(): Date {
        return new Date(Date.now());
    }

    getMetadataSource() {
        let link = `${this.settings.providerUrl}/Objekt/${this.id}`;
        return {
            source_base: this.settings.providerUrl,
            raw_data_source: link,
            portal_link: this.settings.defaultAttributionLink,
            attribution: this.settings.defaultAttribution
        };
    }

    getIssued(): Date {
        return undefined;
    }

    getKeywords(): Record<string,string> {
        return this.record.Schlagwoerter;
    }

    getModifiedDate(): Date {
        return new Date(this.record.ZuletztGeaendert);
    }

    getHarvestedData(): string {
        return JSON.stringify(this.record);
    }

    // TODO implement if needed

    // getThemes(): string[] {
    //     throw new Error('Method not implemented.');
    // }
    // getAccessRights(): string[] {
    //     throw new Error('Method not implemented.');
    // }
    // isRealtime(): boolean {
    //     throw new Error('Method not implemented.');
    // }
    getTemporal(): DateRange[] {
        let ranges = [];
        if (this.record.AnfangVon || this.record.AnfangBis) {
            ranges.push({ gte: this.record.AnfangVon, lte: this.record.AnfangBis })
        }
        if (this.record.EndeVon || this.record.EndeBis) {
            ranges.push({ gte: this.record.EndeVon, lte: this.record.EndeBis })
        }
        return ranges;
    }
    // getCitation(): string {
    //     throw new Error('Method not implemented.');
    // }
    // getAccrualPeriodicity(): string {
    //     throw new Error('Method not implemented.');
    // }
    // getCreator(): Person | Person[] {
    //     throw new Error('Method not implemented.');
    // }
    // getSubSections(): any[] {
    //     throw new Error('Method not implemented.');
    // }
    // getGroups(): string[] {
    //     throw new Error('Method not implemented.');
    // }
    // getOriginator(): Agent[] {
    //     throw new Error('Method not implemented.');
    // }
    getLicense(): License {
        return {
            id: this.record.Lizenz.Id,
            title: this.record.Lizenz.Lizenz,
            url: this.record.Lizenz.Url,
        };
    }
    // getUrlCheckRequestConfig(uri: string): RequestOptions {
    //     throw new Error('Method not implemented.');
    // }
}
