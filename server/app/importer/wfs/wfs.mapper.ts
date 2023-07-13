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

import { getLogger } from 'log4js';
import { Catalog, PluDocType, PluPlanState, PluPlanType, PluProcedureState, PluProcedureType, ProcessStep } from '../../model/dcatApPlu.model';
import { throwError } from 'rxjs';
import { AllGeoJSON } from '@turf/helpers';
import { BaseMapper } from '../base.mapper';
import { Contact, Organization, Person } from '../../model/agent';
import { DateRange } from '../../model/dateRange';
import { GeoJsonUtils } from '../../utils/geojson.utils';
import { ImporterSettings } from '../../importer.settings';
import { RequestDelegate, RequestOptions } from '../../utils/http-request.utils';
import { Summary } from '../../model/summary';
import { WfsSettings } from './wfs.settings';
import { XPathNodeSelect } from '../../utils/xpath.utils';

export abstract class WfsMapper extends BaseMapper {

    protected log = getLogger();

    protected readonly feature: Node & Element;
    private harvestTime: any;
    private readonly storedData: any;

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

    constructor(settings, feature, harvestTime, storedData, summary, generalInfo, geojsonUtils) {
        super();
        this.settings = settings;
        this.feature = feature;
        this.harvestTime = harvestTime;
        this.storedData = storedData;
        this.summary = summary;
        this.fetched = {...this.fetched, ...generalInfo, geojsonUtils};
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

    async _getPublisher(): Promise<Person[] | Organization[]> {
        return [this.fetched.catalog.publisher];
    }

    _getMaintainers() {
        return undefined;
    }

    async _getContributors(): Promise<Person[] | Organization[]> {
        return undefined
    }

    abstract _getAlternateTitle(): string;

    _getAccessRights(): string[] {
        return undefined;
    }

    _getCategories(): string[] {
        return undefined;
    }

    _getCitation(): string {
        return undefined;
    }

    _getGeneratedId(): string {
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
    _getKeywords(): string[] {
        let mandatoryKws = this.settings.eitherKeywords || [];
        let keywords = this.fetched.keywords[mandatoryKws.join()];
        return keywords;
    }

    // TODO:check
    _getMetadataIssued(): Date {
        return (this.storedData && this.storedData.issued) ? new Date(this.storedData.issued) : new Date(Date.now());
    }

    // TODO:check
    _getMetadataModified(): Date {
        if(this.storedData && this.storedData.modified && this.storedData.dataset_modified){
            let storedDataset_modified: Date = new Date(this.storedData.dataset_modified);
            if(storedDataset_modified.valueOf() === this.getModifiedDate().valueOf())
                return new Date(this.storedData.modified);
        }
        return new Date(Date.now());
    }

    // TODO:check
    _getMetadataSource(): any {
        let wfsLink = `${this.settings.getFeaturesUrl}?REQUEST=GetFeature&SERVICE=WFS&VERSION=${this.settings.version}&outputFormat=application/xml&featureId=${this.uuid}`;
        return {
            raw_data_source: wfsLink,
            portal_link: this.settings.defaultAttributionLink,
            attribution: this.settings.defaultAttribution
        };
    }

    // TODO
    _getModifiedDate() {
        return undefined;
        // return new Date(this.select('./gmd:dateStamp/gco:Date|./gmd:dateStamp/gco:DateTime', this.feature, true).textContent);
    }

    abstract _getBoundingBox(): object;

    _getCentroid(): object {
        let spatial = this._getSpatial() ?? this._getBoundingBox();
        return GeoJsonUtils.getCentroid(<AllGeoJSON>spatial)?.geometry;
    }

    _getTemporal(): DateRange[] {
        return undefined;
    }

    _getThemes() {
        return [];
    }

    _isRealtime(): boolean {
        return undefined;
    }

    _getAccrualPeriodicity(): string {
        return undefined;
    }

    _getLicense() {
        return undefined;
    }

    _getCatalog(): Catalog {
        return this.fetched.catalog;
    }

    _getPluDevelopmentFreezePeriod(): DateRange {
        return undefined;
    }

    abstract _getPluDocType(code: string): PluDocType;

    _getPluPlanState(): PluPlanState {
        let planState = this.settings.pluPlanState;
        switch (planState?.toLowerCase()) {
            case 'festgesetzt': return PluPlanState.FESTGES;
            case 'in aufstellung': return PluPlanState.IN_AUFST;
            default: return PluPlanState.UNBEKANNT;
        }
    }

    abstract _getPluPlanType(): PluPlanType;

    abstract _getPluPlanTypeFine(): string;

    _getPluProcedureState(): PluProcedureState {
        switch (this._getPluPlanState()) {
            case PluPlanState.FESTGES: return PluProcedureState.ABGESCHLOSSEN;
            case PluPlanState.IN_AUFST: return PluProcedureState.LAUFEND;
            default: return PluProcedureState.UNBEKANNT;
        }
    }

    abstract _getPluProcedureType(): PluProcedureType;

    abstract _getPluProcessSteps(): ProcessStep[];

    abstract _getPluProcedureStartDate(): Date;

    _getHarvestedData(): string {
        return this.feature.toString();
    }

    _getCreator(): Person[] {
        return undefined;
    }

    _getGroups(): string[] {
        return undefined;
    }

    _getMetadataHarvested(): Date {
        return new Date(Date.now());
    }

    _getSubSections(): any[] {
        return undefined;
    }

    _getOriginator(): Person[] {
        return undefined;
    }

    // ED: the features themselves contain no contact information
    // we can scrape a little bit from GetCapabilities...
    async _getContactPoint(): Promise<Contact> {
        return this.fetched.contactPoint;
    }

    // TODO
    _getUrlCheckRequestConfig(uri: string): RequestOptions {
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

    protected getTypename(): string {
        return (<Element>this.select('./*', this.feature, true))?.localName;
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
