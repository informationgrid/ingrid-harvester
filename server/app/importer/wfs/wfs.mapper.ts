/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2022 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

/**
 * A mapper for ISO-XML documents harvested over WFS.
 */
import {Contact, DateRange, Distribution, GenericMapper, Organization, Person} from "../../model/generic.mapper";
import {License} from '@shared/license.model';
import {getLogger} from "log4js";
import {UrlUtils} from "../../utils/url.utils";
import {RequestDelegate} from "../../utils/http-request.utils";
import {WfsSummary} from "./wfs.importer";
import {OptionsWithUri} from "request-promise";
import {WfsSettings} from './wfs.settings';
import {throwError} from "rxjs";
import {ImporterSettings} from "../../importer.settings";
import {Summary} from "../../model/summary";
import { pluDocType, pluPlanState, pluPlanType, pluProcedureState, pluProcedureType, pluProcessStepType, ProcessStep } from "../../model/dcatApPlu.document";
import { GeoJsonUtils } from "../../utils/geojson.utils";
import { XPathUtils } from "../../utils/xpath.utils";

export class WfsMapper extends GenericMapper {

    private log = getLogger();

    private readonly feature: Node & Element;
    private harvestTime: any;
    private readonly storedData: any;

    private settings: WfsSettings;
    private readonly uuid: string;
    private summary: WfsSummary;

    private keywordsAlreadyFetched = false;
    private fetched: any = {
        boundingBox: null,
        contactPoint: null,
        keywords: {},
        themes: null
    };

    private select: Function;

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
        this.uuid = this.select(`./*/@gml:id`, feature, true).textContent;

        super.init();
    }

    protected getSettings(): ImporterSettings {
        return this.settings;
    }

    protected getSummary(): Summary {
        return this.summary;
    }

    _getDescription() {
        let abstract = this.select(this.settings.xpaths.description, this.feature, true)?.textContent;
        // if (!abstract) {
        //     let msg = `Dataset doesn't have an abstract. It will not be displayed in the portal. Id: \'${this.uuid}\', title: \'${this.getTitle()}\', source: \'${this.settings.getFeaturesUrl}\'`;
        //     this.log.warn(msg);
        //     this.summary.warnings.push(['No description', msg]);
        //     this.valid = false;
        // }
        return abstract;
    }

    /**
     * This is currently very proprietary...
     *
     * // TODO try to generalize it a bit more
     *
     *  @returns 
     */
    async _getDistributions(): Promise<Distribution[]> {

        // very simple heuristic
        // TODO expand/improve
        function isMaybeDownloadUrl(url: string) {
            let ext = url.slice(url.lastIndexOf('.') + 1).toLowerCase();
            return ['jpeg', 'jpg', 'pdf', 'zip'].includes(ext) || url.toLowerCase().indexOf('service=wfs') > -1;
        }

        let distributions = [];
        for (let distElem of this.select('./*/xplan:externeReferenz/xplan:XP_SpezExterneReferenz', this.feature, false) ?? []) {
            let distribution: Distribution = {
                accessURL: this.select('./xplan:referenzURL', distElem, true)?.textContent,
                description: this.select('./xplan:art', distElem, true)?.textContent,
                format: [this.select('./xplan:referenzMimeType', distElem, true)?.textContent],
                pluDocType: this._getPluDocType(this.select('./xplan:typ', distElem, true)?.textContent)
            };
            distributions.push(distribution);
        }
        for (let xp of ['./*/fis:SCAN_WWW', './*/fis:GRUND_WWW']) {
            let elem = this.select(xp, this.feature, true);
            if (elem) {
                let distribution: Distribution = { accessURL: elem.textContent };
                if (isMaybeDownloadUrl(distribution.accessURL)) {
                    distribution.downloadURL = distribution.accessURL;
                }
                distributions.push(distribution);
            }
        }
        return distributions ? distributions : undefined;
    }

    // TODO
    async handleDistributionforService(srvIdent, urlsFound): Promise<Distribution[]> {

        let getCapabilitiesElement = this.select(
            // convert containing text to lower case
            './srv:containsOperations/srv:SV_OperationMetadata[./srv:operationName/gco:CharacterString/text()[contains(translate(\'GetCapabilities\', \'ABCEGILPST\', \'abcegilpst\'), "getcapabilities")]]/srv:connectPoint/*/gmd:linkage/gmd:URL',
            srvIdent,
            true);
        let getCapablitiesUrl = getCapabilitiesElement ? getCapabilitiesElement.textContent : null;
        let serviceFormat = this.select('.//srv:serviceType/gco:LocalName', srvIdent, true);
        let serviceTypeVersion = this.select('.//srv:serviceTypeVersion/gco:CharacterString', srvIdent);
        let serviceLinks: Distribution[] = [];

        if(serviceFormat){
            serviceFormat = serviceFormat.textContent;
        }

        if (getCapablitiesUrl) {
            let lowercase = getCapablitiesUrl.toLowerCase();
            if (lowercase.match(/\bwms\b/)) serviceFormat = 'WMS';
            if (lowercase.match(/\bwfs\b/)) serviceFormat = 'WFS';
            if (lowercase.match(/\bwcs\b/)) serviceFormat = 'WCS';
            if (lowercase.match(/\bwmts\b/)) serviceFormat = 'WMTS';
        }

        if (serviceTypeVersion) {
            for(let i = 0; i < serviceTypeVersion.length; i++) {
                let lowercase = serviceTypeVersion[i].textContent.toLowerCase();
                if (lowercase.match(/\bwms\b/)) serviceFormat = 'WMS';
                if (lowercase.match(/\bwfs\b/)) serviceFormat = 'WFS';
                if (lowercase.match(/\bwcs\b/)) serviceFormat = 'WCS';
                if (lowercase.match(/\bwmts\b/)) serviceFormat = 'WMTS';
            }
        }


        let operations = this.select('./srv:containsOperations/srv:SV_OperationMetadata', srvIdent);

        for (let i = 0; i < operations.length; i++) {
            let onlineResource = this.select('./srv:connectPoint/gmd:CI_OnlineResource', operations[i], true);

            if(onlineResource) {
                let urlNode = this.select('gmd:linkage/gmd:URL', onlineResource, true);
                let protocolNode = this.select('gmd:protocol/gco:CharacterString', onlineResource, true);

                let title = this.getTitle();

                let operationNameNode = this.select('srv:operationName/gco:CharacterString', operations[i], true);
                if(operationNameNode){
                    title = title + " - " + operationNameNode.textContent;
                }

                let requestConfig = this.getUrlCheckRequestConfig(urlNode.textContent);
                let url = await UrlUtils.urlWithProtocolFor(requestConfig, this.settings.skipUrlCheckOnHarvest);
                if (url && !urlsFound.includes(url)) {
                    serviceLinks.push({
                        accessURL: url,
                        format: [protocolNode ? protocolNode.textContent : serviceFormat],
                        title: (title && title.length > 0) ? title : undefined
                    });
                    urlsFound.push(url);
                }
            }
        }

        return serviceLinks;

    }

    async _getPublisher(): Promise<Person[] | Organization[]> {
        return [this.fetched.catalog.publisher];
    }

    _getTitle() {
        let title = this.select(this.settings.xpaths.name, this.feature, true)?.textContent;
        return title && title.trim() !== '' ? title : undefined;
    }

    /**
     * For Open Data, GDI-DE expects access rights to be defined three times:
     * - As text in useLimitation
     * - As text in a useConstraints/otherConstraints combination
     * - As a JSON-snippet in a useConstraints/otherConstraints combination
     *
     * Use limitations can also be defined as separate fields
     * Plus access constraints can be set from the ISO codelist MD_RestrictionCode
     *
     * GeoDCAT-AP of the EU on the other had uses the
     * useLimitation/accessConstraints=otherRestritions/otherConstraints
     * combination and uses the accessRights field to store this information.
     *
     * We use a combination of these strategies:
     * - Use the accessRights field like GeoDCAT-AP but store:
     *    + all the useLimitation items
     *    + all otherConstraints texts for useConstraints/otherConstraints
     *      combinations that are not JSON-snippets.
     */
    // TODO:check
    _getAccessRights(): string[] {
        return undefined;
    }

    // TODO
    _getCategories(): string[] {
        let subgroups = [];
        let keywords = this.getKeywords();
        if (keywords) {
            keywords.forEach(k => {
                k = k.trim();
                if (k === 'mcloud_category_roads' || k === 'mcloud-kategorie-straßen') subgroups.push('roads');
                if (k === 'mcloud_category_climate' || k === 'mcloud-kategorie-klima-und-wetter') subgroups.push('climate');
                if (k === 'mcloud_category_waters' || k === 'mcloud-kategorie-wasserstraßen-und-gewässer') subgroups.push('waters');
                if (k === 'mcloud_category_railway' || k === 'mcloud-kategorie-bahn') subgroups.push('railway');
                if (k === 'mcloud_category_infrastructure' || k === 'mcloud-kategorie-infrastuktur') subgroups.push('infrastructure');
                if (k === 'mcloud_category_aviation' || k === 'mcloud-kategorie-luft--und-raumfahrt') subgroups.push('aviation');
            });
        }
        if (subgroups.length === 0) subgroups.push(...this.settings.defaultMcloudSubgroup);
        return subgroups;
    }

    // TODO:check
    _getCitation(): string {
        return undefined;
    }

    // TODO
    async _getDisplayContacts() {

        let contactPoint = await this.getContactPoint();
        let displayContact: Person;

        if (contactPoint) {
            let displayName;

            if (contactPoint['organization-name']) {
                displayName = contactPoint['organization-name'];
            } else if (contactPoint.fn) {
                displayName = contactPoint.fn;
            }

            displayContact = {
                name: displayName,
                homepage: contactPoint.hasURL
            };
        } else {
            let publisher = await this._getPublisher();

            if (publisher) {
                let displayName;

                if ('organization' in publisher[0]) {
                    displayName = publisher[0].organization;
                } else if ('name' in publisher[0]) {
                    displayName = publisher[0].name;
                }

                displayContact = {
                    name: displayName.trim(),
                    homepage: publisher[0].homepage
                };
            } else {
                let creator = this.getCreator();

                displayContact = {
                    name: creator[0].name.trim(),
                    homepage: creator[0].homepage
                };
            }
        }
        return [displayContact];
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
            if(storedDataset_modified.valueOf() === this.getModifiedDate().valueOf()  )
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

    _getBoundingBoxGml(): string {
        let envelope: Element = this.select('./*/gml:boundedBy/gml:Envelope', this.feature, true);
        if (!envelope) {
            return undefined;
        }
        if (envelope.hasAttribute('srsName')) {
            envelope.setAttribute('gml:srsName', envelope.getAttribute('srsName'));
            envelope.removeAttribute('srsName');
        }
        else {
            envelope.setAttribute('gml:srsName', this.fetched.defaultCrs);
        }
        return envelope.toString();
    }

    _getBoundingBox(): any {
        if (this.fetched.boundingBox) {
            return this.fetched.boundingBox;
        }
        let envelope = this.select('./*/gml:boundedBy/gml:Envelope', this.feature, true);
        if (envelope) {
            let lowerCorner = this.select('./gml:lowerCorner', envelope, true)?.textContent;
            let upperCorner = this.select('./gml:upperCorner', envelope, true)?.textContent;
            if (lowerCorner && upperCorner) {
                let crs = envelope.getAttribute('srsName');
                return this.fetched.geojsonUtils.getBoundingBox(lowerCorner, upperCorner, crs);
            }
        }
        return undefined;
    }

    _getSpatialGml(): string {
        let spatialContainer = this.select(this.settings.xpaths.spatial, this.feature, true);
        if (!spatialContainer) {
            return undefined;
        }
        let child = XPathUtils.firstElementChild(spatialContainer);
        if (child == null) {
            return undefined;
        }
        if (!child.hasAttribute('srsName')) {
            child.setAttribute('srsName', this.fetched.defaultCrs);
        }
        return child.toString();
    }

    _getSpatial(): any {
        let spatialContainer = this.select(this.settings.xpaths.spatial, this.feature, true);
        if (!spatialContainer) {
            // use bounding box as fallback
            return this._getBoundingBox();
        }
        let child = XPathUtils.firstElementChild(spatialContainer);
        if (child == null) {
            return undefined;
        }

        // TODO the CRS lookup is far from ideal, and atm very proprietary:
        // for XPLAN just use the srsName attribute; for FIS, it's encoded in the element name
        let crs = child.getAttribute('srsName');
        if (!crs) {
            crs = spatialContainer.localName.split('_')[1];
        }
        // TODO this is not robust and very much specialized for the XPLAN WFS documents
        if (!crs) {
            crs = this.fetched.defaultCrs;
        }
        else if (!crs.startsWith('EPSG:')) {
            crs = 'EPSG:' + crs;
        }
        let geojson = this.fetched.geojsonUtils.parse(child, { crs: crs });
        return geojson;
    }

    /**
     * This is currently XPlan specific.
     * And even for those, source-specific.
     * 
     * // TODO what about other WFS sources?
     * 
     * @param code 
     * @returns 
     */
    _getSpatialText(): string {
        // find existing Regionalschluessel corresponding to the retrieved/constructed entry
        const findLegalRs = (rs) => {
            let r = new RegExp(rs);
            return this.fetched.regionalschluessel.filter(aRs => r.test(aRs));
        }

        let xpGemeinde = this.select('./*/xplan:gemeinde/xplan:XP_Gemeinde', this.feature, true);
        if (xpGemeinde) {
            let rs = this.select('./xplan:rs', xpGemeinde, true)?.textContent;
            if (!rs) {
                let ags = this.select('./xplan:ags', xpGemeinde, true)?.textContent;
                let gemeinde = this.select('./xplan:ortsteilName', xpGemeinde, true)?.textContent;
                if (ags) {
                    if (gemeinde && gemeinde.match("^\\d{3}$")) {
                        rs = ags.substring(0, 2) + "\\d{3}0" + gemeinde + gemeinde;
                        if (findLegalRs(rs).length == 0) {
                            rs = ags.substring(0, 2) + "\\d{7}" + gemeinde;
                        }
                    }
                    else {
                        rs = ags.substring(0, 2) + "\\d{7}" + ags.substring(5, 8);
                    }
                }
            }
            let existingRs = findLegalRs(rs);
            if (existingRs.length == 1) {
                return existingRs[0];
            }
        }
        return undefined;
    }

    _getCentroid(): number[] {
        let spatial = this._getSpatial() ?? this._getBoundingBox();
        return GeoJsonUtils.getCentroid(spatial)?.geometry.coordinates;
    }

    // TODO
    _getTemporal(): DateRange[] {
        // let suffix = this.getErrorSuffix(this.uuid, this.getTitle());

        // let result: DateRange[] = [];

        // let nodes = this.select('./*/gmd:extent/*/gmd:temporalElement/*/gmd:extent/gml:TimePeriod|./*/gmd:extent/*/gmd:temporalElement/*/gmd:extent/gml32:TimePeriod', this.idInfo);

        // for (let i = 0; i < nodes.length; i++) {
        //     let begin = this.getTimeValue(nodes[i], 'begin');
        //     let end = this.getTimeValue(nodes[i], 'end');

        //     if (begin || end) {
        //         result.push({
        //             gte: begin ? begin : undefined,
        //             lte: end ? end : undefined
        //         });
        //     }
        // }
        // nodes = this.select('./*/gmd:extent/*/gmd:temporalElement/*/gmd:extent/gml:TimeInstant/gml:timePosition|./*/gmd:extent/*/gmd:temporalElement/*/gmd:extent/gml32:TimeInstant/gml32:timePosition', this.idInfo);

        // let times = nodes.map(node => node.textContent);
        // for (let i = 0; i < times.length; i++) {
        //     result.push({
        //         gte: new Date(times[i]),
        //         lte: new Date(times[i])
        //     });
        // }

        // if(result.length)
        //     return result;

        return undefined;
    }

    // TODO
    getTimeValue(node, beginOrEnd: 'begin' | 'end'): Date {
        let dateNode = this.select('./gml:' + beginOrEnd + 'Position|./gml32:' + beginOrEnd + 'Position', node, true);
        if (!dateNode) {
            dateNode = this.select('./gml:' + beginOrEnd + '/*/gml:timePosition|./gml32:' + beginOrEnd + '/*/gml32:timePosition', node, true);
        }
        try {
            if (!dateNode.hasAttribute('indeterminatePosition')) {
                let text = dateNode.textContent;
                let date = new Date(Date.parse(text));
                if (date) {
                    return date;
                } else {
                    this.log.warn(`Error parsing begin date, which was '${text}'. It will be ignored.`);
                }
            }
        } catch (e) {
            this.log.error(`Cannot extract time range.`, e);
        }
    }

    // TODO:check
    _getThemes() {
        return [];
    }

    protected mapCategoriesToThemes(categories, keywords): string[]{
        let themes: string[] = [];

        categories.map(category => category.textContent).forEach(category => {
            switch (category) {

                case "farming":
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'AGRI');
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'ENVI');
                    break;
                case "biota":
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'ENVI');
                    break;
                case "boundaries":
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'REGI');
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'GOVE');
                    break;
                case "climatologyMeteorology Atmosphere":
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'ENVI');
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'TECH');
                    break;
                case "economy":
                    themes.push('ECON');
                    if (keywords.includes("Energiequellen")) {
                        themes.push(GenericMapper.DCAT_CATEGORY_URL + 'ENER');
                        themes.push(GenericMapper.DCAT_CATEGORY_URL + 'ENVI');
                        themes.push(GenericMapper.DCAT_CATEGORY_URL + 'TECH');
                    }
                    if (keywords.includes("Mineralische Bodenschätze")) {
                        themes.push(GenericMapper.DCAT_CATEGORY_URL + 'ENVI');
                        themes.push(GenericMapper.DCAT_CATEGORY_URL + 'TECH');
                    }
                    break;
                case "elevation":
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'ENVI');
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'GOVE');
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'TECH');
                    break;
                case "environment":
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'ENVI');
                    break;
                case "geoscientificInformation":
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'REGI');
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'ENVI');
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'TECH');
                    break;
                case "health":
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'HEAL');
                    break;
                case "imageryBaseMapsEarthCover ":
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'ENVI');
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'GOVE');
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'TECH');
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'REGI');
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'AGRI');
                    break;
                case "intelligenceMilitary":
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'JUST');
                    break;
                case "inlandWaters":
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'ENVI');
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'TRAN');
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'AGRI');
                    break;
                case "location":
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'REGI');
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'GOVE');
                    break;
                case "oceans":
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'ENVI');
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'TRAN');
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'AGRI');
                    break;
                case "planningCadastre":
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'REGI');
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'GOVE');
                    if (keywords.includes("Flurstücke/Grundstücke")) {
                        themes.push(GenericMapper.DCAT_CATEGORY_URL + 'JUST');
                    }
                    break;
                case "society":
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'SOCI');
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'EDUC');
                    break;
                case "structure":
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'REGI');
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'TRAN');
                    if (keywords.includes("Produktions- und Industrieanlagen")) {
                        themes.push(GenericMapper.DCAT_CATEGORY_URL + 'ECON');
                    }
                    if (keywords.includes("Umweltüberwachung")) {
                        themes.push(GenericMapper.DCAT_CATEGORY_URL + 'ENVI');
                    }
                    break;
                case "transportation":
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'TRAN');
                    break;
                case "utilitiesCommunication":
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'ENER');
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'ENVI');
                    themes.push(GenericMapper.DCAT_CATEGORY_URL + 'GOVE');
                    break;
            }
        });

        return themes;
    }

    _isRealtime(): boolean {
        return undefined;
    }

    // TODO
    _getAccrualPeriodicity(): string {
        // Multiple resourceMaintenance elements are allowed. If present, use the first one
        // let freq = this.select('./*/gmd:resourceMaintenance/*/gmd:maintenanceAndUpdateFrequency/gmd:MD_MaintenanceFrequencyCode', this.idInfo);
        // if (freq.length > 0) {
        //     let periodicity = DcatPeriodicityUtils.getPeriodicity(freq[0].getAttribute('codeListValue'))
        //     if(!periodicity){
        //         this.summary.warnings.push(["Unbekannte Periodizität", freq[0].getAttribute('codeListValue')]);
        //     }
        //     return periodicity;
        // }
        return undefined;
    }

    // TODO:check
    async _getLicense() {
        let license: License;
        return license;
    }

    async _getCatalog() {
        return this.fetched.catalog;
    }

    /**
     * This is currently XPlan specific.
     * 
     * // TODO fill in the gaps
     * // TODO what about other WFS sources?
     * 
     * @param code 
     * @returns 
     */
    _getPluDocType(code: string): string {
        switch (code) {
            // case '1000': return pluDocType.;// Beschreibung
            // case '1010': return pluDocType.;// Begründung
            // case '1020': return pluDocType.;// Legende
            // case '1030': return pluDocType.;// Rechtsplan
            // case '1040': return pluDocType.;// Plangrundlage - Abbildung auf BackgroundMapValue (siehe Tabelle 17)
            // case '1050': return pluDocType.;// Umweltbericht
            // case '1060': return pluDocType.;// Satzung
            // case '1065': return pluDocType.;// Verordnung
            // case '1070': return pluDocType.;// Karte
            case '1080': return pluDocType.ERLAEUT_BER; // Erläuterung
            // case '1090': return pluDocType.;// Zusammenfassende Erklärung
            // case '2000': return pluDocType.;// Koordinatenliste
            // case '2100': return pluDocType.;// Grundstücksverzeichnis
            // case '2200': return pluDocType.;// Pflanzliste
            // case '2300': return pluDocType.;// Grünordnungsplan
            // case '2400': return pluDocType.;// Erschließungsvertrag
            // case '2500': return pluDocType.;// Durchführungsvertrag
            // case '2600': return pluDocType.;// Städtebaulicher Vertrag
            // case '2700': return pluDocType.;// Umweltbezogene Stellungnahmen
            // case '2800': return pluDocType.;// Beschluss
            // case '2900': return pluDocType.;// Vorhaben- und Erschliessungsplan
            // case '3000': return pluDocType.;// Metadaten von Plan
            // case '9998': return pluDocType.;// Rechtsverbindlich
            // case '9999': return pluDocType.;// Informell
            default: return undefined;
        }
    }

    // TODO check
    _getPluPlanState(): string {
        let planState = this.select(this.settings.xpaths.pluPlanState, this.feature, true)?.textContent ?? this.settings.xpaths.pluPlanState;
        if (['ja', 'festgesetzt'].includes(planState.toLowerCase())) {
            return pluPlanState.FESTGES;
        }
        else if (['nein', 'in aufstellung'].includes(planState.toLowerCase())) {
            return pluPlanState.IN_AUFST;
        }
        return pluPlanState.UNBEKANNT;
    }

    /**
     * This is currently XPlan specific.
     * 
     * // TODO fill in the gaps
     * // TODO what about other WFS sources?
     * 
     * @returns 
     */
    _getPluPlanType(): string {
        let typename = this.select('./*', this.feature, true)?.localName;
        switch (typename) {
            case 'BP_Plan': return pluPlanType.BEBAU_PLAN;
            case 'FP_Plan': return pluPlanType.FLAECHENN_PLAN;
            case 'RP_Plan': return pluPlanType.RAUM_ORDN_PLAN;
            case 'SO_Plan': return pluPlanType.SONST_PLAN;
            case 'sach_bplan': return pluPlanType.BEBAU_PLAN;   // TODO check
            default: this.log.debug('No pluPlanType available for typename', typename); return pluPlanType.UNBEKANNT;
        }
    }

    /**
     * This is currently XPlan specific.
     * This is based on:
     * - https://xleitstelle.de/sites/default/files/objektartenkataloge/5_4/html/xplan_BP_Plan.html#xplan_BP_Plan_planArt
     * - https://xleitstelle.de/sites/default/files/objektartenkataloge/5_4/html/xplan_FP_Plan.html#xplan_FP_Plan_planArt
     * - https://xleitstelle.de/sites/default/files/objektartenkataloge/5_4/html/xplan_RP_Plan.html#xplan_RP_Plan_planArt
     *
     * Note especially that we use the XPlan 5.4 codelists for all XPlan documents!
     * 
     * The mappings targets are taken from the INSPIRE codelist for plan type name:
     * https://registry.gdi-de.org/codelist/de.xleitstelle.inspire_plu/PlanTypeNameValue
     * 
     * // TODO fill in the gaps
     * // TODO what about other WFS sources?
     * // TODO check differently versioned codelists for discrepancies
     * 
     * @returns 
     */
    _getPluPlanTypeFine(): string {
        let typename = this.select('./*', this.feature, true)?.localName;
        let planart = this.select('./*/xplan:planArt', this.feature, true)?.textContent;
        switch (typename) {
            case 'BP_Plan':
                switch(planart) {
                    case '1000': return '6_Bebauungsplan';    // BPlan
                    case '10000': return '6_3_EinfacherBPlan';    // EinfacherBPlan
                    case '10001': return '6_1_QualifizierterBPlan';   // QualifizierterBPlan
                    // case 10002: return pluPlanTypeFine.;    // BebauungsplanZurWohnraumversorgung
                    case '3000': return '6_2_VorhabenbezogenerBPlan'; // VorhabenbezogenerBPlan
                    // case 3100: return pluPlanTypeFine.; // VorhabenUndErschliessungsplan
                    case '4000': return '7_InnenbereichsSatzung';     // InnenbereichsSatzung
                    case '40000': return '7_1_KlarstellungsSatzung';  // KlarstellungsSatzung
                    case '40001': return '7_2_EntwicklungsSatzung';   // EntwicklungsSatzung
                    case '40002': return '7_3_ErgaenzungsSatzung';    // ErgaenzungsSatzung
                    case '5000': return '8_AussenbereichsSatzung';    // AussenbereichsSatzung
                    // case 7000: return pluPlanTypeFine.; // OertlicheBauvorschrift
                    // case 9999: return pluPlanTypeFine.; // Sonstiges
                    default: this.log.debug('No planTypeFine available for xplan:planArt', planart); return undefined;
                }
            case 'FP_Plan':
                switch(planart) {
                    case '1000': return '5_2_FPlan';  // FPlan
                    case '2000': return '4_2_GemeinsamerFPlan';   // GemeinsamerFPlan
                    case '3000': return '4_1_RegFPlan';   // RegFPlan
                    // case 4000: return '';   // FPlanRegPlan
                    case '5000': return '5_3_SachlicherTeilplan'; // SachlicherTeilplan
                    // case 9999: return pluPlanTypeFine.; // Sonstiges
                    default: this.log.debug('No planTypeFine available for xplan:planArt', planart); return undefined;
                }
            case 'RP_Plan':
                switch(planart) {
                    case '1000': return '3_1_Regionalplan';   // Regionalplan
                    case '2000': return '3_3_SachlicherTeilplanRegionalebene';   // SachlicherTeilplanRegionalebene
                    case '2001': return '2_2_SachlicherTeilplanLandesebene';  // SachlicherTeilplanLandesebene
                    case '3000': return '2_3_Braunkohlenplan';    // Braunkohlenplan
                    case '4000': return '2_1_LandesweiterRaumordnungsplan';   // LandesweiterRaumordnungsplan
                    case '5000': return '1_1_StandortkonzeptBund';    // StandortkonzeptBund
                    case '5001': return '1_2_AWZPlan';    // AWZPlan
                    case '6000': return '3_2_RaeumlicherTeilplan';    // RaeumlicherTeilplan
                    // case 9999: return pluPlanTypeFine.; // Sonstiges
                    default: this.log.debug('No planTypeFine available for xplan:planArt', planart); return undefined;
                }
            case 'SO_Plan':
                // TODO no codelists found!
                // codeSpace="www.mysynergis.com/XPlanungR/5.1/0"; but URL (or similar) does not exist
                switch(planart) {
                    // TODO possibly more values possible; these are the ones found in the data so far
                    // case 2000: return pluPlanTypeFine.;
                    // case 17200: return pluPlanTypeFine.;
                    default: this.log.debug('No planTypeFine available for xplan:planArt', planart); return undefined;
                }
            default:
                return undefined;
        }
    }

    _getPluProcedureState(): string {
        switch (this._getPluPlanState()) {
            case pluPlanState.FESTGES: return pluProcedureState.ABGESCHLOSSEN;
            case pluPlanState.IN_AUFST: return pluProcedureState.LAUFEND;
            default: return pluProcedureState.UNBEKANNT;
        }
    }

    /**
     * This is currently XPlan specific.
     * 
     * // TODO more process steps?
     * // TODO what about other WFS sources?
     */
    _getPluProcedureType(): string {
        let procedureType = this.select('./*/xplan:verfahren', this.feature, true)?.textContent;
        switch (procedureType) {
            case '1000': return pluProcedureType.NORM_VERF;         // Normal
            case '2000': return pluProcedureType.VEREINF_VERF;      // Parag13
            case '3000': return pluProcedureType.BEBAU_PLAN_INNEN;  // Parag13a
            // case '4000': return pluProcedureType.;     // Parag13b
            default: this.log.debug('No procedure type available for xplan:verfahren', procedureType); return pluProcedureType.UNBEKANNT;
        }
    }

    /**
     * This is currently FIS specific.
     * 
     * // TODO more process steps?
     * // TODO what about other WFS sources?
     */
    _getPluProcessSteps(): ProcessStep[] {

        const getPeriod = (startXpath: string, endXpath: string) => {
            let period: DateRange;
            let start = this.select(startXpath, this.feature, true)?.textContent;
            if (start) {
                period = { gte: start };
            }
            let end = this.select(endXpath, this.feature, true)?.textContent;
            if (end) {
                if (!start) {
                    period = {};
                    this.log.warn(`Skipping ProcessStep.period: An end date (${endXpath}) was specified where a start date (${startXpath}) is missing:`, this.uuid);
                }
                else if (start > end) {
                    this.log.warn(`Skipping ProcessStep.period: The start date (${start}) is later than the end date (${end}):`, this.uuid);
                    return {};
                }
                period.lte = end;
            }
            return period;
        };

        let processSteps = [];
        // let period_aufstBeschl = getPeriod('./*/fis:AFS_BESCHL', './*/fis:AFS_L_AEND');
        // if (period_aufstBeschl) {
        //     processSteps.push({
        //         period: period_aufstBeschl,
        //         type: null  // TODO
        //     });
        // }
        let period_frzBuergerBet = getPeriod('./*/fis:BBG_ANFANG', './*/fis:BBG_ENDE');
        if (period_frzBuergerBet) {
            processSteps.push({
                period: period_frzBuergerBet,
                type: pluProcessStepType.FRUEHZ_OEFFTL_BETEIL
            });
        }
        let period_oefftlAusleg = getPeriod('./*/fis:AUL_ANFANG', './*/fis:AUL_ENDE');
        if (period_oefftlAusleg) {
            let link = this.select('./*/fis:AUSLEG_WWW', this.feature, true)?.textContent;
            processSteps.push({
                distributions: link ? [{ accessURL: link }] : null,
                period: period_oefftlAusleg,
                type: pluProcessStepType.OEFFTL_AUSL
            });
        }
        return processSteps;
    }

    /**
     * TODO This is currently very proprietary.
     * 
     * FIS: fis:AFS_BESCHL
     * XPLAN: xplan:aufstellungsbeschlussDatum
     */
    _getPluProcedureStartDate(): Date {
        let procedureStartDate = this.select(this.settings.xpaths.pluProcedureStartDate, this.feature, true)?.textContent;
        return procedureStartDate;
    }

    getErrorSuffix(uuid, title) {
        return `Id: '${uuid}', title: '${title}', source: '${this.settings.getFeaturesUrl}'.`;
    }

    _getHarvestedData(): string {
        return this.feature.toString();
    }

    // TODO
    _getCreator(): Person[] {
        let creators = [];
        // // Look up contacts for the dataset first and then the metadata contact
        // let queries = [
        //     './gmd:identificationInfo/*/gmd:pointOfContact/gmd:CI_ResponsibleParty',
        //     './gmd:contact/gmd:CI_ResponsibleParty'
        // ];
        // for (let i = 0; i < queries.length; i++) {
        //     let contacts = this.select(queries[i], this.feature);
        //     for (let j = 0; j < contacts.length; j++) {
        //         let contact = contacts[j];
        //         let role = this.select('./gmd:role/gmd:CI_RoleCode/@codeListValue', contact, true).textContent;

        //         let name = this.select('./gmd:individualName/gco:CharacterString', contact, true);
        //         let organisation = this.select('./gmd:organisationName/gco:CharacterString', contact, true);
        //         let email = this.select('./gmd:contactInfo/*/gmd:address/*/gmd:electronicMailAddress/gco:CharacterString', contact, true);

        //         if (role === 'originator' || role === 'author') {
        //             let creator: creatorType = {};
        //             /*
        //              * Creator has only one field for name. Use either the name
        //              * of the organisation or the person for this field. The
        //              * organisation name has a higher priority.
        //              */
        //             if (organisation) {
        //                 creator.name = organisation.textContent;
        //             } else if (name) {
        //                 creator.name = name.textContent;
        //             }
        //             if (email) creator.mbox = email.textContent;

        //             let alreadyPresent = creators.filter(c => c.name === creator.name && c.mbox === creator.mbox).length > 0;
        //             if (!alreadyPresent) {
        //                 creators.push(creator);
        //             }
        //         }
        //     }
        // }
        return creators.length === 0 ? undefined : creators;
    }

    _getGroups(): string[] {
        return undefined;
    }

    /**
     * This is currently XPlan WFS specific.
     * 
     * // TODO what about FIS WFS?
     * 
     * @returns 
     */
    _getIssued(): Date {
        let issued = this.select('./*/xplan:technHerstellDatum')?.textContent;
        return issued;
    }

    _getMetadataHarvested(): Date {
        return new Date(Date.now());
    }

    _getSubSections(): any[] {
        return undefined;
    }

    // TODO
    _getOriginator(): Person[] {

        let originators: any[] = [];

        // let queries = [
        //     './gmd:identificationInfo/*/gmd:pointOfContact/gmd:CI_ResponsibleParty',
        //     './gmd:contact/gmd:CI_ResponsibleParty'
        // ];
        // for (let i = 0; i < queries.length; i++) {
        //     let contacts = this.select(queries[i], this.feature);
        //     for (let j = 0; j < contacts.length; j++) {
        //         let contact = contacts[j];
        //         let role = this.select('./gmd:role/gmd:CI_RoleCode/@codeListValue', contact, true).textContent;

        //         if (role === 'originator') {
        //             let name = this.select('./gmd:individualName/gco:CharacterString', contact, true);
        //             let org = this.select('./gmd:organisationName/gco:CharacterString', contact, true);
        //             let email = this.select('./gmd:contactInfo/*/gmd:address/*/gmd:electronicMailAddress/gco:CharacterString', contact, true);
        //             let url = this.select('./gmd:contactInfo/*/gmd:onlineResource/*/gmd:linkage/gmd:URL', contact, true);

        //             if (!name && !org) continue;

        //             let originator: Agent = {
        //                 homepage: url ? url.textContent : undefined,
        //                 mbox: email ? email.textContent : undefined
        //             };
        //             if (name) {
        //                 (<Person>originator).name = name.textContent
        //             } else {
        //                 (<Organization>originator).organization = org.textContent
        //             }

        //             let alreadyPresent = originators.filter(other => {
        //                 return other.name === (<Person>originator).name
        //                     && other.organization === (<Organization>originator).organization
        //                     && other.mbox === originator.mbox
        //                     && other.homepage === originator.homepage;
        //             }).length > 0;
        //             if (!alreadyPresent) {
        //                 originators.push(originator);
        //             }
        //         }
        //     }
        // }

        return originators.length > 0 ? originators : undefined;
    }

    // ED: the features themselves contain no contact information
    // we can scrape a little bit from GetCapabilities...
    async _getContactPoint(): Promise<Contact> {
        return this.fetched.contactPoint;
    }

    // TODO
    _getUrlCheckRequestConfig(uri: string): OptionsWithUri {
        let config: OptionsWithUri = {
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

    protected getUuid(): string {
        return this.uuid;
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

// Private interface. Do not export
interface creatorType {
    name?: string;
    mbox?: string;
}
