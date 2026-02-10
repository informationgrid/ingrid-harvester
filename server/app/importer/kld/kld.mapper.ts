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

/**
 * A mapper for documents harvested from KuLaDig.
 */
import type { License } from '@shared/license.model.js';
import type { Geometry } from 'geojson';
import log4js from 'log4js';
import type { ToElasticMapper } from '../../importer/to.elastic.mapper.js';
import type { Contact, Organization, Person } from '../../model/agent.js';
import type { IndexDocument } from '../../model/index.document.js';
import type { Summary } from '../../model/summary.js';
import type { LvrDateRange, Media, Relation } from '../../profiles/lvr/model/index.document.js';
import * as MiscUtils from '../../utils/misc.utils.js';
import { Mapper } from '../mapper.js';
import type { Document, ObjectResponse, RelatedObject } from './kld.api.js';
import { getDocumentUrl, MediaType, RelationType } from './kld.api.js';
import type { KldSettings } from './kld.settings.js';

export class KldMapper extends Mapper<KldSettings> implements ToElasticMapper<IndexDocument> {

    log = log4js.getLogger();

    private readonly record: ObjectResponse;
    private readonly id: string;

    constructor(settings: KldSettings, record: ObjectResponse, harvestTime: Date, summary: Summary) {
        super(settings, summary);
        this.record = record;
        this.id = record.Id;

        super.init();
    }

    async createEsDocument(): Promise<IndexDocument> {
        return {
            extras: {
                metadata: this.getHarvestingMetadata(),
            }
        };
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
            let msg = `Dataset doesn't have an abstract. It will not be displayed in the portal. Id: \'${this.id}\', title: \'${this.getTitle()}\', source: \'${this.getSettings().sourceURL}\'`;
            this.log.warn(msg);
            this.getSummary().warnings.push(['No description', msg]);
            this.valid = false;
        }
        return abstract;
    }

    getSpatial(): Geometry {
        return this.record.Polygon;
    }

    getSpatialText(): string {
        return this.record.Adresse;
    }

    getTemporal(): LvrDateRange[] {
        // extract maximum range from AnfangVon, AnfangBis to EndeVon, EndeBis
        const { gte: startStart, lte: startEnd } = this.parseDateRange([this.record.AnfangVon, this.record.AnfangBis]);
        const { gte: endStart, lte: endEnd } = this.parseDateRange([this.record.EndeVon, this.record.EndeBis]);
        const start = startStart ?? endStart
        const end = endEnd ?? (endStart ?? startEnd)
        if (start && end && start > end) {
            const message = `Inconsistent dates found in object ${this.record.Id}: \
                Start (${new Date(start).toJSON()}) is greater than end (${new Date(end).toJSON()}).`;
            this.getSummary().warnings.push(['Inconsistent dates', message]);
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

    async getMedia(): Promise<Media[]> {
        return await Promise.all(this.record.Dokumente.map((d: Document) => this.mapDocument(d)));
    }

    getLicense(): License {
        return {
            title: this.record.Lizenz.Lizenz,
            url: this.record.Lizenz.Url,
        };
    }

    getMetadataSource() {
        let link = `${this.getSettings().sourceURL}Objekt/${this.id}`;
        return {
            source_base: this.getSettings().sourceURL,
            raw_data_source: link,
            source_type: 'kld',
            portal_link: this.getSettings().defaultAttributionLink,
            attribution: this.getSettings().defaultAttribution
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

    private parseDateRange(dates: string[]): LvrDateRange {
        const parseLvrTime = (dateStr: string) => {
            if (dateStr == '0') {
                return null;
            }
            let m = dateStr?.toString().match(/^(-?)(\d{0,5})$/);
            return m?.length > 2 ? m[1] + m[2].padStart(4, '0') : MiscUtils.normalizeDateTime(dateStr);
        };
        const values = dates.map(parseLvrTime).filter(date => date != null);//.sort((a, b) => a.valueOf() - b.valueOf());
        const start = values.length > 0 ? values[0] : null;
        const end = values.length > 0 ? values[values.length-1] : null;
        return { gte: start, lte: end };
    }

    private mapRelatedObject(related: RelatedObject, type: RelationType): Relation {
        return {
            id: related.Id,
            type: this.getEnumKey(RelationType, type).toLowerCase()
        }
    }

    private async mapDocument(document: Document): Promise<Media> {
        let mediaURL = getDocumentUrl(this.takeFirstNonEmpty(document, ['DownloadToken', 'Thumbnail3Token', 'Thumbnail2Token', 'Thumbnail1Token']));
        return {
            // @ts-expect-error MediaType ensures that Media.type will be correctly typed
            type: this.getEnumKey(MediaType, document.Medientyp).toLowerCase(),
            url: mediaURL,
            thumbnail: getDocumentUrl(this.takeFirstNonEmpty(document, ['Thumbnail2Token', 'Thumbnail3Token', 'Thumbnail1Token'])),
            description: this.takeFirstNonEmpty(document, ['Ueberschrift', 'Beschreibung', 'AlternativeBeschreibung']),
            dimensions: await MiscUtils.getImageDimensionsFromURL(mediaURL)
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
