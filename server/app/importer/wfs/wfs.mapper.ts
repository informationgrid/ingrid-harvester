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

import * as GeoJsonUtils from '../../utils/geojson.utils';
import { getLogger } from 'log4js';
import { Catalog, PluDocType, PluPlanState, PluPlanType, PluProcedureState, PluProcedureType, ProcessStep } from '../../model/dcatApPlu.model';
import { throwError } from 'rxjs';
import { BaseMapper } from '../base.mapper';
import { Contact, Organization, Person } from '../../model/agent';
import { DateRange } from '../../model/dateRange';
import { Geometry, GeometryCollection, Point } from '@turf/helpers';
import { ImporterSettings } from '../../importer.settings';
import { MetadataSource } from '../../model/index.document';
import { RequestDelegate, RequestOptions } from '../../utils/http-request.utils';
import { Summary } from '../../model/summary';
import { WfsSettings } from './wfs.settings';
import { XPathNodeSelect } from '../../utils/xpath.utils';

export abstract class WfsMapper extends BaseMapper {

    log = getLogger();

    protected readonly feature: Node & Element;
    private harvestTime: any;

    private settings: WfsSettings;
    protected readonly uuid: string;
    private summary: Summary;

    protected fetched: any = {
        boundingBox: null,
        contactPoint: null,
        keywords: {},
        themes: null
    };

    protected select: XPathNodeSelect;

    constructor(settings, feature, harvestTime, summary, generalInfo) {
        super();
        this.settings = settings;
        this.feature = feature;
        this.harvestTime = harvestTime;
        this.summary = summary;
        this.fetched = {...this.fetched, ...generalInfo};
        this.select = (...args: any[]) => {
            try {
                return generalInfo['select'](...args);
            }
            catch {
                // quietly swallow select errors (esp. namespace errors where we are too lazy to handle e.g. XPLAN and FIS separately)
                return undefined;
            }
        };
        this.uuid = this.getTextContent(`./*/@gml:id`);

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

    getMaintainers() {
        return undefined;
    }

    async getContributors(): Promise<Person[] | Organization[]> {
        return undefined
    }

    abstract getAlternateTitle(): string;

    getAccessRights(): string[] {
        return undefined;
    }

    getCategories(): string[] {
        return undefined;
    }

    getCitation(): string {
        return undefined;
    }

    getGeneratedId(): string {
        return this.uuid;
    }

    /**
     * Extracts and returns an array of keywords defined in the ISO-XML document.
     * This method also checks if these keywords contain at least one of the
     * given mandatory keywords. If this is not the case, then the mapped
     * document is flagged to be skipped from the index. By default this array
     * contains just one entry 'opendata' i.e. if the ISO-XML document doesn't
     * have this keyword defined, then it will be skipped from the index.
     */
    // TODO:check
    getKeywords(): string[] {
        let mandatoryKws = this.settings.eitherKeywords || [];
        let keywords = this.fetched.keywords[mandatoryKws.join()];
        return keywords;
    }

    // TODO:check
    getMetadataSource(): MetadataSource {
        let wfsLink = `${this.settings.getFeaturesUrl}?REQUEST=GetFeature&SERVICE=WFS&VERSION=${this.settings.version}&outputFormat=application/xml&featureId=${this.uuid}`;
        return {
            source_base: this.settings.getFeaturesUrl,
            raw_data_source: wfsLink,
            portal_link: this.settings.defaultAttributionLink,
            attribution: this.settings.defaultAttribution
        };
    }

    // TODO
    getModifiedDate() {
        return undefined;
        // return new Date(this.select('./gmd:dateStamp/gco:Date|./gmd:dateStamp/gco:DateTime', this.feature, true).textContent);
    }

    abstract getBoundingBox(): Geometry;

    abstract getSpatial(): Geometry | GeometryCollection;

    getCentroid(): Point {
        let spatial = this.getSpatial() ?? this.getBoundingBox();
        return GeoJsonUtils.getCentroid(<Geometry | GeometryCollection>spatial);
    }

    getTemporal(): DateRange[] {
        return undefined;
    }

    getThemes() {
        return [];
    }

    isRealtime(): boolean {
        return undefined;
    }

    getAccrualPeriodicity(): string {
        return undefined;
    }

    getLicense() {
        return undefined;
    }

    getCatalog(): Catalog {
        return this.fetched.catalog;
    }

    getPluDevelopmentFreezePeriod(): DateRange {
        return undefined;
    }

    abstract getPluDocType(code: string): PluDocType;

    getPluPlanState(): PluPlanState {
        return this.settings.pluPlanState;
    }

    abstract getPluPlanType(): PluPlanType;

    abstract getPluPlanTypeFine(): string;

    getPluProcedureState(): PluProcedureState {
        switch (this.getPluPlanState()) {
            case PluPlanState.FESTGES: return PluProcedureState.ABGESCHLOSSEN;
            case PluPlanState.IN_AUFST: return PluProcedureState.LAUFEND;
            default: return PluProcedureState.UNBEKANNT;
        }
    }

    abstract getPluProcedureType(): PluProcedureType;

    abstract getPluProcessSteps(): ProcessStep[];

    abstract getPluProcedureStartDate(): Date;

    getPluNotification() {
        return undefined;
    }

    getAdmsIdentifier() {
        return undefined;
    }

    getRelation() {
        return undefined;
    }

    getHarvestedData(): string {
        return this.feature.toString();
    }

    getCreator(): Person[] {
        return undefined;
    }

    getGroups(): string[] {
        return undefined;
    }

    getHarvestingDate(): Date {
        return new Date(Date.now());
    }

    getSubSections(): any[] {
        return undefined;
    }

    getOriginator(): Person[] {
        return undefined;
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

    protected getTextContent(xpathStr: string, searchNode: Node = this.feature) {
        return (<Element>this.select(xpathStr, searchNode, true))?.textContent;
    }

    protected getTypename(toLowerCase: boolean = true): string {
        let typename = (<Element>this.select('./*', this.feature, true))?.localName;
        return toLowerCase ? typename.toLowerCase() : typename;
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
