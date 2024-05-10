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
import { Geometries } from '@turf/helpers';
import { ImporterSettings } from '../../importer.settings';
import { KldSettings } from './kld.settings';
import { License } from '@shared/license.model';
import { ObjectResponse, RelatedObject, Document, getDocumentUrl, RelationType, MediaType } from './kld.api';
import { Summary } from '../../model/summary';
import { DateRange, Media, Relation } from '../../profiles/lvr/model/index.document';

export class KldMapper extends BaseMapper {

    log = getLogger();

    private readonly record: ObjectResponse;
    private readonly id: string;

    private settings: KldSettings;
    private summary: Summary;

    constructor(settings: KldSettings, record: ObjectResponse, harvestTime: Date, summary: Summary) {
        super();
        this.settings = settings;
        this.record = record;
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

    getGeneratedId(): string {
        return this.id;
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

    getSpatial(): Geometries {
        return this.record.Polygon;
    }

    getSpatialText(): string {
        return this.record.Adresse;
    }

    getTemporal(): DateRange[] {
        // extract maximum range from AnfangVon, AnfangBis to EndeVon, EndeBis
        const [startStart, startEnd] = this.parseDateRange([this.record.AnfangVon, this.record.AnfangBis]);
        const [endStart, endEnd] = this.parseDateRange([this.record.EndeVon, this.record.EndeBis]);
        const start = startStart ?? endStart
        const end = endEnd ?? (endStart ?? startEnd)
        if (start && end && start > end) {
            const message = `Inconsistent dates found in object ${this.record.Id}: \
                Start (${new Date(start).toJSON()}) is greater than end (${new Date(end).toJSON()}).`;
            this.summary.appErrors.push(message);
        }
        const range = { gte: start, lte: end };
        return [range];
    }

    getKeywords(): Record<string,string> {
        return this.record.Schlagwoerter;
    }

    getRelations(): Relation[] {
        let relations: Relation[] = [];

        if (this.record.UebergeordnetesObjekt) {
            relations.push(this.mapRelatedObject(this.record.UebergeordnetesObjekt, RelationType.Parent));
        }
        relations = relations.concat(this.record.UntergeordneteObjekte.map((r: RelatedObject) => this.mapRelatedObject(r, RelationType.Child)));
        relations = relations.concat(this.record.VerwandteObjekte.map((r: RelatedObject) => this.mapRelatedObject(r, RelationType.Related)));
        return relations;
    }

    getMedia(): Media[] {
        let media: Media[] = [];

        media = media.concat(this.record.Dokumente.map((d: Document) => this.mapDocument(d)));
        return media;
    }

    getLicense(): License {
        return {
            title: this.record.Lizenz.Lizenz,
            url: this.record.Lizenz.Url,
        };
    }

    getMetadataSource() {
        let link = `${this.settings.providerUrl}Objekt/${this.id}`;
        return {
            source_base: this.settings.providerUrl,
            raw_data_source: link,
            portal_link: this.settings.defaultAttributionLink,
            attribution: this.settings.defaultAttribution
        };
    }

    getIssued(): Date {
        // NOTE creation date does not exist in data
        return undefined;
    }

    getModifiedDate(): Date {
        return new Date(this.record.ZuletztGeaendert);
    }

    getHarvestedData(): string {
        return JSON.stringify(this.record);
    }

    getHarvestingDate(): Date {
        // TODO not used?
        return new Date(Date.now());
    }

    async getContactPoint(): Promise<Contact> {
        // TODO not used?
        const contact: Contact = {
            fn: this.record.Datenherkunft?.Name,
            hasURL: this.record.Datenherkunft?.Url,
        };
        return new Promise((resolve) => resolve(contact));
    }

    async getPublisher(): Promise<Person[] | Organization[]> {
        // TODO not used?
        const publisher: Person = {
            name: this.record.Datenherkunft?.Name,
        };
        return new Promise((resolve) => resolve([publisher]));
    }

    private parseDate(date: string|null): number|null {
        if (!date) {
            return null;
        }
        let millis = 0;
        const dateAsNumber = Number(date);
        if (!isNaN(dateAsNumber)) {
            // Data.parse does not parse BC years correctly
            let resultDate = new Date(Date.UTC(1970, 0, 1, 0, 0, 0, 0));
            millis = resultDate.setFullYear(dateAsNumber);
        }
        else {
            millis = Date.parse(date);
        }
        return millis;
    }

    private parseDateRange(dates: string[]): [number|null, number|null] {
        const values = dates.map(this.parseDate).filter((date: number|null) => date != null).sort((a: number, b: number) => a - b);
        const start = values.length > 0 ? values[0] : null;
        const end = values.length > 0 ? values[values.length-1] : null;
        return [start, end];
    }

    private mapRelatedObject(related: RelatedObject, type: RelationType): Relation {
        // TODO calculate score
        return {
            id: related.Id,
            type: this.getEnumKey(RelationType, type).toLowerCase(),
            score: -1
        }
    }

    private mapDocument(document: Document): Media {
        return {
            type: this.getEnumKey(MediaType, document.Medientyp).toLowerCase(),
            url: getDocumentUrl(this.takeFirstNonEmpty(document, ['DownloadToken', 'Thumbnail3Token', 'Thumbnail2Token', 'Thumbnail1Token'])),
            description: this.takeFirstNonEmpty(document, ['Ueberschrift', 'Beschreibung', 'AlternativeBeschreibung'])
        }
    }

    private takeFirstNonEmpty(object: object, attributes: string[]): string {
        const nonEmpty = attributes.map((attr: string) => object[attr] ?? '').filter((value: string) => value.length > 0);
        return nonEmpty.length > 0 ? nonEmpty[0] : '';
    }

    private getEnumKey(e: object, value: string, valueIfMissing: string=''): string {
        const key = Object.keys(e).find(k => e[k] == value);
        return key ?? valueIfMissing;
    }
}
