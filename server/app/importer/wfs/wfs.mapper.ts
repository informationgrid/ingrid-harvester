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

import * as GeoJsonUtils from '../../utils/geojson.utils.js';
import log4js from 'log4js';
import { throwError } from 'rxjs';
import { BaseMapper } from '../base.mapper.js';
import type { Catalog } from '../../model/dcatApPlu.model.js';
import type { Contact, Organization, Person } from '../../model/agent.js';
import type { Distribution } from '../../model/distribution.js';
import type { Geometry, Point } from 'geojson';
import type { ImporterSettings } from '../../importer.settings.js';
import type { MetadataSource } from '../../model/index.document.js';
import type { RequestOptions } from '../../utils/http-request.utils.js';
import { RequestDelegate } from '../../utils/http-request.utils.js';
import type { Summary } from '../../model/summary.js';
import type { WfsSettings } from './wfs.settings.js';
import type { XPathNodeSelect } from '../../utils/xpath.utils.js';

export class WfsMapper extends BaseMapper {

    log = log4js.getLogger();

    readonly featureOrFeatureType: Node & Element;
    readonly featureTypeDescription: Node & Element;
    readonly fetched: any;
    readonly settings: WfsSettings;
    readonly uuid: string;

    private harvestTime: any;
    private summary: Summary;

    select: XPathNodeSelect;

    constructor(settings, featureOrFeatureType, harvestTime, summary, generalInfo) {
        super();
        this.settings = settings;
        this.featureOrFeatureType = featureOrFeatureType;
        this.featureTypeDescription = generalInfo['featureTypeDescription'];
        this.harvestTime = harvestTime;
        this.summary = summary;
        this.fetched = {
            boundingBox: null,
            contactPoint: null,
            keywords: {},
            themes: null,
            ...generalInfo
        };
        this.select = (...args: any[]) => {
            try {
                return generalInfo['select'](...args);
            }
            catch {
                // quietly swallow select errors (esp. namespace errors where we are too lazy to handle e.g. XPLAN and FIS separately)
                return undefined;
            }
        };
        let path = this.isFeatureType() ? './wfs:Name' : './*/@gml:id';
        this.uuid = this.getTextContent(path);

        super.init();
    }

    getSettings(): ImporterSettings {
        return this.settings;
    }

    getSummary(): Summary {
        return this.summary;
    }

    async getPublisher(): Promise<Person[] | Organization[]> {
        return [this.fetched.catalog.publisher];
    }

    async getMaintainers(): Promise<Person[] | Organization[]> {
        return [this.fetched.maintainer];
    }

    async getContributors(): Promise<Person[] | Organization[]> {
        return undefined
    }

    getTitle(): string {
        return this.fetched.title;
        // if (this.isFeatureType()) {
        //     return this.select('./wfs:Title', this.featureOrFeatureType, true)?.textContent;
        // }
        // else {
        //     return this.getTextContent('./*/*[local-name()="name"]|./*/@gml:id')?.trim();
        // }
    }

    getDescription(): string {
        if (this.isFeatureType()) {
            return this.select('./wfs:Abstract', this.featureOrFeatureType, true)?.textContent;
        }
        else {
            return undefined;
        }
    }

    getDistributions(): Promise<Distribution[]> {
        return undefined;
    }

    isFeatureType(): boolean {
        return this.featureOrFeatureType.localName == 'FeatureType';
    }

    getNumberOfFeatures(): number {
        return this.fetched.numFeatures;
    }

    getGeneratedId(): string {
        return this.uuid;
    }

    // TODO:check
    getMetadataSource(): MetadataSource {
        let wfsLink = `${this.settings.sourceURL}?REQUEST=GetFeature&SERVICE=WFS&VERSION=${this.settings.version}&outputFormat=application/xml&featureId=${this.uuid}`;
        return {
            source_base: this.settings.sourceURL,
            raw_data_source: wfsLink,
            source_type: 'wfs',
            portal_link: this.settings.defaultAttributionLink,
            attribution: this.settings.defaultAttribution
        };
    }

    getIssued(): Date {
        return undefined;
    }

    // TODO
    getModifiedDate(): Date {
        return undefined;
        // return new Date(this.select('./gmd:dateStamp/gco:Date|./gmd:dateStamp/gco:DateTime', this.feature, true).textContent);
    }

    getBoundingBox(): Geometry {
        let obbox = this.getOriginalBoundingBox();
        return obbox ? GeoJsonUtils.getBoundingBox(obbox.lowerCorner, obbox.upperCorner, obbox.crs) : undefined;
    }

    getOriginalBoundingBox(): Record<string, string> {
        let lowerCorner: string, upperCorner: string, crs: string;
        if (this.isFeatureType()) {
            let bbox = this.select('./ows:WGS84BoundingBox', this.featureOrFeatureType, true);
            if (!bbox) {
                return null;
            }
            lowerCorner = this.select('./ows:LowerCorner', bbox, true)?.textContent;
            upperCorner = this.select('./ows:UpperCorner', bbox, true)?.textContent;
            crs = 'WGS84';
            if (!lowerCorner || !upperCorner) {
                return null;
            }
        }
        else {
            let bbox = this.select('./*/gml:boundedBy/gml:Envelope', this.featureOrFeatureType, true);
            if (!bbox) {
                return null;
            }
            lowerCorner = this.select('./gml:lowerCorner', bbox, true)?.textContent;
            upperCorner = this.select('./gml:upperCorner', bbox, true)?.textContent;
            crs = (<Element>bbox).getAttribute('srsName') || this.fetched['defaultCrs'];
        }
        return { lowerCorner, upperCorner, crs };
    }

    getSpatial(): Geometry {
        return undefined;
    }

    getSpatialText(): string {
        return undefined;
    }

    getCentroid(): Point {
        let spatial = this.getSpatial() ?? this.getBoundingBox();
        return GeoJsonUtils.getCentroid(<Geometry>spatial);
    }

    isRealtime(): boolean {
        return undefined;
    }

    getCatalog(): Catalog {
        return this.fetched.catalog;
    }

    getHarvestedData(): string {
        return this.featureOrFeatureType.toString();
    }

    getHarvestingDate(): Date {
        return new Date(Date.now());
    }

    // ED: the features themselves contain no contact information
    // we can scrape a little bit from GetCapabilities...
    async getContactPoint(): Promise<Contact> {
        return this.fetched.contactPoint;
    }

    // TODO
    protected getUrlCheckRequestConfig(uri: string): RequestOptions {
        let config: RequestOptions = {
            method: 'HEAD',
            json: false,
            headers: RequestDelegate.defaultRequestHeaders(),
            qs: {},
            uri: uri
        };

        if (this.settings.proxy) {
            config.proxy = this.settings.proxy;
        }

        return config;
    }

    getTextContent(xpathStr: string, searchNode: Node = this.featureOrFeatureType) {
        return this.select(xpathStr, searchNode, true)?.textContent;
    }

    getTypename(toLowerCase: boolean = false): string {
        return toLowerCase ? this.fetched['typename'].toLowerCase() : this.fetched['typename'];
    }

    executeCustomCode(doc: any) {
        try {
            if (this.settings.customCode) {
                eval(this.settings.customCode);
            }
        } catch (error) {
            throwError('An error occurred in custom code: ' + error.message);
        }
    }
}
