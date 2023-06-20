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
 * A mapper for ISO-XML documents harvested over CSW.
 */
import { AllGeoJSON } from "@turf/helpers";
import {BaseMapper} from "../base.mapper";
import {License} from '@shared/license.model';
import {getLogger} from "log4js";
import {UrlUtils} from "../../utils/url.utils";
import {RequestDelegate, RequestOptions} from "../../utils/http-request.utils";
import {CswSettings} from './csw.settings';
import {throwError} from "rxjs";
import {DcatPeriodicityUtils} from "../../utils/dcat.periodicity.utils";
import {DcatLicensesUtils} from "../../utils/dcat.licenses.utils";
import {Summary} from "../../model/summary";
import { GeoJsonUtils } from "../../utils/geojson.utils";
import { MiscUtils } from '../../utils/misc.utils';
import {Agent, Contact, Organization, Person} from "../../model/agent";
import {DateRange} from "../../model/dateRange";
import {Distribution} from "../../model/distribution";
const xpath = require('xpath');

export class CswMapper extends BaseMapper {

    static GMD = 'http://www.isotc211.org/2005/gmd';
    static GCO = 'http://www.isotc211.org/2005/gco';
    static GML = 'http://www.opengis.net/gml';
    static GML_3_2 = 'http://www.opengis.net/gml/3.2';
    static CSW = 'http://www.opengis.net/cat/csw/2.0.2';
    static OWS = 'http://www.opengis.net/ows';
    static PLU = 'here goes the custom PLU URL';
    static SRV = 'http://www.isotc211.org/2005/srv';
    static RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
    static RDFS = 'http://www.w3.org/2000/01/rdf-schema#';
    static DCAT = 'http://www.w3.org/ns/dcat#';
    static DCT = 'http://purl.org/dc/terms/';
    static VCARD = 'http://www.w3.org/2006/vcard/ns#';

    static nsMap = {
        'csw': CswMapper.CSW,
        'gmd': CswMapper.GMD,
        'gco': CswMapper.GCO,
        'gml': CswMapper.GML,
        'gml32': CswMapper.GML_3_2,
        'ows': CswMapper.OWS,
        'plu': CswMapper.PLU,
        'srv': CswMapper.SRV
    };

    static select = xpath.useNamespaces(CswMapper.nsMap);

    protected log = getLogger();

    protected readonly record: any;
    private harvestTime: any;
    private readonly storedData: any;

    protected readonly idInfo; // : SelectedValue;
    protected settings: CswSettings;
    private readonly uuid: string;
    protected summary: Summary;

    private keywordsAlreadyFetched = false;
    protected fetched: any = {
        contactPoint: null,
        keywords: {},
        themes: null
    };

    constructor(settings, record, harvestTime, storedData, summary, generalInfo) {
        super();
        this.settings = settings;
        this.record = record;
        this.harvestTime = harvestTime;
        this.storedData = storedData;
        this.summary = summary;
        this.fetched = MiscUtils.merge(this.fetched, generalInfo);

        this.uuid = CswMapper.getCharacterStringContent(record, 'fileIdentifier');

        this.idInfo = CswMapper.select('./gmd:identificationInfo', record, true);

        super.init();
    }

    public getSettings(): CswSettings {
        return this.settings;
    }

    public getSummary(): Summary {
        return this.summary;
    }

    _getDescription() {
        return CswMapper.select('./*/gmd:abstract/gco:CharacterString', this.idInfo, true)?.textContent;
    }

    async _getDistributions(): Promise<Distribution[]> {
        let dists = [];
        let urlsFound = [];

        let srvIdent = CswMapper.select('./srv:SV_ServiceIdentification', this.idInfo, true);
        if (srvIdent) {
            dists = await this.handleDistributionforService(srvIdent, urlsFound);
        }

        let distNodes = CswMapper.select('./gmd:distributionInfo/gmd:MD_Distribution', this.record);
        for (let i = 0; i < distNodes.length; i++) {
            let distNode = distNodes[i];
            let id = distNode.getAttribute('id');
            if (!id) id = distNode.getAttribute('uuid');

            let formats = [];
            let urls: Distribution[] = [];

            CswMapper.select('./gmd:distributionFormat/gmd:MD_Format/gmd:name/gco:CharacterString', distNode).forEach(format => {
                format.textContent.split(',').forEach(formatItem => {
                    if (!formats.includes(formatItem)) {
                        formats.push(formatItem.trim());
                    }
                });
            });

            // Combine formats in a single slash-separated string
            if (formats.length === 0) formats.push('Unbekannt');

            let onlineResources = CswMapper.select('./gmd:transferOptions/gmd:MD_DigitalTransferOptions/gmd:onLine/gmd:CI_OnlineResource', distNode);
            for (let j = 0; j < onlineResources.length; j++) {
                let onlineResource = onlineResources[j];

                let urlNode = CswMapper.select('gmd:linkage/gmd:URL', onlineResource);
                let title = CswMapper.select('gmd:name/gco:CharacterString', onlineResource, true)?.textContent;
                let protocolNode = CswMapper.select('gmd:protocol/gco:CharacterString', onlineResource);

                let url = null;
                if (urlNode.length > 0) {
                    let requestConfig = this.getUrlCheckRequestConfig(urlNode[0].textContent);
                    url = await UrlUtils.urlWithProtocolFor(requestConfig, this.settings.skipUrlCheckOnHarvest);
                }
                if (url && !urls.some(alreadyUrl => alreadyUrl.accessURL == url)) {
                    const formatArray = protocolNode.length > 0 && protocolNode[0].textContent
                        ? [protocolNode[0].textContent]
                        : formats;

                    let dist: Distribution = {
                        accessURL: url,
                        title: title,
                        format: UrlUtils.mapFormat(formatArray, this.summary.warnings)
                    };

                    urls.push(dist);
                }
            }

            // Filter out URLs that have already been found
            urls = urls.filter(item => !urlsFound.includes(item.accessURL));

            // Set id only if there is a single resource
            if (urls.length === 1 && id) urls[0].id = id;

            // add distributions to all
            dists.push(...urls);
        }

        return dists;
    }

    async handleDistributionforService(srvIdent, urlsFound): Promise<Distribution[]> {

        let getCapablitiesUrl = CswMapper.select(
            // convert containing text to lower case
            './srv:containsOperations/srv:SV_OperationMetadata[./srv:operationName/gco:CharacterString/text()[contains(translate(\'GetCapabilities\', \'ABCEGILPST\', \'abcegilpst\'), "getcapabilities")]]/srv:connectPoint/*/gmd:linkage/gmd:URL',
            srvIdent,
            true)?.textContent;
        let serviceFormat = CswMapper.select('./srv:serviceType/gco:LocalName', srvIdent, true)?.textContent;
        let serviceTypeVersion = CswMapper.select('./srv:serviceTypeVersion/gco:CharacterString', srvIdent);
        let serviceLinks: Distribution[] = [];

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

        let operations = CswMapper
            .select('./srv:containsOperations/srv:SV_OperationMetadata', srvIdent);

        let title = this.getTitle();
        for (let i = 0; i < operations.length; i++) {
            let onlineResource = CswMapper.select('./srv:connectPoint/gmd:CI_OnlineResource', operations[i], true);

            if (onlineResource) {
                let urlNode = CswMapper.select('gmd:linkage/gmd:URL', onlineResource, true);
                let protocol = CswMapper.select('gmd:protocol/gco:CharacterString', onlineResource, true)?.textContent;
                let operationName = CswMapper.select('srv:operationName/gco:CharacterString', operations[i], true)?.textContent;
                let currentTitle = operationName ? title + " - " + operationName : title;

                let requestConfig = this.getUrlCheckRequestConfig(urlNode.textContent);
                let url = await UrlUtils.urlWithProtocolFor(requestConfig, this.settings.skipUrlCheckOnHarvest);
                if (url && !urlsFound.includes(url)) {
                    serviceLinks.push({
                        accessURL: url,
                        format: [protocol ?? serviceFormat],
                        title: currentTitle
                    });
                    urlsFound.push(url);
                }
            }
        }

        return serviceLinks;

    }

    async _getPublisher(): Promise<Person[] | Organization[]> {
        let publishers = [];
        let otherContacts = [];
        // Look up contacts for the dataset first and then the metadata contact
        let queries = [
            './gmd:identificationInfo/gmd:MD_DataIdentification/gmd:pointOfContact/gmd:CI_ResponsibleParty',
            './gmd:contact/gmd:CI_ResponsibleParty'
        ];
        for (let i = 0; i < queries.length; i++) {
            let contacts = CswMapper.select(queries[i], this.record);
            for (let j = 0; j < contacts.length; j++) {
                let contact = contacts[j];
                let role = CswMapper.select('./gmd:role/gmd:CI_RoleCode/@codeListValue', contact, true).textContent;

                let name = CswMapper.select('./gmd:individualName/gco:CharacterString', contact, true);
                let org = CswMapper.select('./gmd:organisationName/gco:CharacterString', contact, true);
                let urlNode = CswMapper.select('./gmd:contactInfo/gmd:CI_Contact/gmd:onlineResource/gmd:CI_OnlineResource/gmd:linkage/gmd:URL', contact, true);

                let url = null;
                if (urlNode) {
                    let requestConfig = this.getUrlCheckRequestConfig(urlNode.textContent);
                    url = await UrlUtils.urlWithProtocolFor(requestConfig, this.settings.skipUrlCheckOnHarvest);
                }

                let infos: any = {};
                if (name) infos.name = name.textContent;
                if (url) infos.homepage = url;
                if (org) infos.organization = org.textContent;

                if (role === 'publisher') {
                    publishers.push(infos);
                }
                else {
                    otherContacts.push(infos);
                }
            }
        }

        if (publishers.length === 0) {
            // if (otherContacts.length === 0) {
            this.summary.missingPublishers++;
            return undefined;
            // }
            // else {
            //     // ED: 2022-09-15: use other contacts as fallback instead
            //     // TODO add a toggle in UI whether to use this fallback
            //     return otherContacts;
            // }
        } else {
            return publishers;
        }
    }

    async _getMaintainers(): Promise<Person[] | Organization[]> {
        let maintainers = [];
        let otherContacts = [];
        // Look up contacts for the dataset first and then the metadata contact
        let queries = [
            './gmd:identificationInfo/gmd:MD_DataIdentification/gmd:pointOfContact/gmd:CI_ResponsibleParty',
            './gmd:contact/gmd:CI_ResponsibleParty'
        ];
        for (let i = 0; i < queries.length; i++) {
            let contacts = CswMapper.select(queries[i], this.record);
            for (let j = 0; j < contacts.length; j++) {
                let contact = contacts[j];
                let role = CswMapper.select('./gmd:role/gmd:CI_RoleCode/@codeListValue', contact, true).textContent;

                let name = CswMapper.select('./gmd:individualName/gco:CharacterString', contact, true);
                let org = CswMapper.select('./gmd:organisationName/gco:CharacterString', contact, true);
                let urlNode = CswMapper.select('./gmd:contactInfo/gmd:CI_Contact/gmd:onlineResource/gmd:CI_OnlineResource/gmd:linkage/gmd:URL', contact, true);

                let url = null;
                if (urlNode) {
                    let requestConfig = this.getUrlCheckRequestConfig(urlNode.textContent);
                    url = await UrlUtils.urlWithProtocolFor(requestConfig, this.settings.skipUrlCheckOnHarvest);
                }

                let infos: any = {};
                if (name) infos.name = name.textContent;
                if (url) infos.homepage = url;
                if (org) infos.organization = org.textContent;

                if (role === 'custodian' || role === 'pointOfContact') {
                    maintainers.push(infos);
                }
                else {
                    otherContacts.push(infos);
                }
            }
        }

        return maintainers.length > 0 ? maintainers : undefined;
    }

    _getTitle() {
        let title = CswMapper.select('./*/gmd:citation/gmd:CI_Citation/gmd:title/gco:CharacterString', this.idInfo, true)?.textContent;
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
    _getAccessRights(): string[] {
        // Extract all useLimitation texts
        let limitations = CswMapper.select('./*/gmd:resourceConstraints/*/gmd:useLimitation', this.idInfo)
            .map(node => CswMapper.getCharacterStringContent(node)) // Extract the text
            .filter(text => text) // Filter out falsy items
            .map(text => text.trim());

        // Select 'otherConstraints' elements that have a 'useConstraints' sibling
        let constraints = CswMapper.select('./*/gmd:resourceConstraints/*[./gmd:useConstraints and ./gmd:otherConstraints]/gmd:otherConstraints', this.idInfo)
            .map(node => CswMapper.getCharacterStringContent(node)) // Extract the text
            .filter(text => text) // Filter out null and undefined values
            .map(text => text.trim())
            .filter(text => text && !limitations.includes(text.trim()) && !text.match(/"url"\s*:\s*"([^"]+)"/)); // Keep non-empty (truthy) items that are not defined in useLimitations and are not a JSON-snippet

        // Combine useLimitations and otherConstraints and store in accessRights
        let accessRights = limitations.concat(constraints);
        if (accessRights.length > 0) {
            return accessRights;
        }
        return undefined;
    }

    _getCitation(): string {
        return undefined;
    }

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
            let publisher = await this.getPublisher();

            if (publisher) {
                let displayName;

                if ('organization' in publisher[0]) {
                    displayName = publisher[0].organization;
                } else {
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
    _getKeywords(): string[] {
        let mandatoryKws = this.settings.eitherKeywords || [];
        let keywords = this.fetched.keywords[mandatoryKws.join()];
        if (keywords) {
            return keywords;
        }

        keywords = [];
        CswMapper.select('./gmd:identificationInfo/gmd:MD_DataIdentification/gmd:descriptiveKeywords/gmd:MD_Keywords/gmd:keyword/gco:CharacterString|./gmd:identificationInfo/srv:SV_ServiceIdentification/gmd:descriptiveKeywords/gmd:MD_Keywords/gmd:keyword/gco:CharacterString', this.record).forEach(node => {
            keywords.push(node.textContent);
        });

        /*
         * Check keywords. Mark datasets as valid only if:
         * - there are no mandatory keywords OR
         * - at least one of the mandatory keywords is present
         */
        let valid = mandatoryKws.length === 0;
        valid = valid || keywords.reduce((accumulator, currentValue) => {
            return accumulator || mandatoryKws.includes(currentValue);
        }, false);
        if (!valid) {
            // Don't index metadata-sets without any of the mandatory keywords
            this.log.info(`None of the mandatory keywords ${JSON.stringify(mandatoryKws)} found. Item will be ignored. ID: '${this.uuid}', Title: '${this.getTitle()}', Source: '${this.settings.getRecordsUrl}'.`);
            this.skipped = true;
        }

        // Update the statistics
        if (!this.keywordsAlreadyFetched && valid) {
            this.summary.opendata++;
        }

        this.keywordsAlreadyFetched = true;

        this.fetched.keywords[mandatoryKws.join()] = keywords;
        return keywords;
    }

    _getMetadataIssued(): Date {
        return (this.storedData && this.storedData.issued) ? new Date(this.storedData.issued) : new Date(Date.now());
    }

    _getMetadataModified(): Date {
        if(this.storedData && this.storedData.modified && this.storedData.dataset_modified){
            let storedDataset_modified: Date = new Date(this.storedData.dataset_modified);
            if(storedDataset_modified.valueOf() === this.getModifiedDate().valueOf()  )
                return new Date(this.storedData.modified);
        }
        return new Date(Date.now());
    }

    _getMetadataSource(): any {
        let gmdEncoded = encodeURIComponent(CswMapper.GMD);
        let cswLink = `${this.settings.getRecordsUrl}?REQUEST=GetRecordById&SERVICE=CSW&VERSION=2.0.2&ElementSetName=full&outputFormat=application/xml&outputSchema=${gmdEncoded}&Id=${this.uuid}`;
        return {
            raw_data_source: cswLink,
            portal_link: this.settings.defaultAttributionLink,
            attribution: this.settings.defaultAttribution
        };
    }

    _getModifiedDate() {
        return new Date(CswMapper.select('./gmd:dateStamp/gco:Date|./gmd:dateStamp/gco:DateTime', this.record, true).textContent);
    }

    _getSpatial(): object {
        return this.getGeometry(false);
    }

    protected getGeometry(forcePolygon: boolean) {
        let geographicBoundingBoxes = CswMapper.select('(./srv:SV_ServiceIdentification/srv:extent|./gmd:MD_DataIdentification/gmd:extent)/gmd:EX_Extent/gmd:geographicElement/gmd:EX_GeographicBoundingBox', this.idInfo);
        let geometries = [];
        for (let i=0; i < geographicBoundingBoxes.length; i++){
            let geographicBoundingBox = geographicBoundingBoxes[i];
            let west = parseFloat(CswMapper.select('./gmd:westBoundLongitude', geographicBoundingBox, true).textContent.trim());
            let east = parseFloat(CswMapper.select('./gmd:eastBoundLongitude', geographicBoundingBox, true).textContent.trim());
            let south = parseFloat(CswMapper.select('./gmd:southBoundLatitude', geographicBoundingBox, true).textContent.trim());
            let north = parseFloat(CswMapper.select('./gmd:northBoundLatitude', geographicBoundingBox, true).textContent.trim());

            // check if within bounds
            let geometryValid = true;
            if (Math.abs(west) > 180) {
                geometryValid = false;
                this.addInvalidationReason(`westBoundLongitude is out of bounds (${west})`);
            }
            if (Math.abs(east) > 180) {
                geometryValid = false;
                this.addInvalidationReason(`eastBoundLongitude is out of bounds (${east})`);
            }
            if (Math.abs(south) > 90) {
                geometryValid = false;
                this.addInvalidationReason(`southBoundLatitude is out of bounds (${south})`);
            }
            if (Math.abs(north) > 90) {
                geometryValid = false;
                this.addInvalidationReason(`northBoundLatitude is out of bounds (${north})`);
            }
            if (south > north) {
                geometryValid = false;
                this.addInvalidationReason(`southBoundLatitude > northBoundLatitude (${south} > ${north})`);
            }

            if (!geometryValid) {
                this.valid = false;
            }
            else {
                geometries.push(this.getGeoJson(west, east, north, south, forcePolygon));
            }
        }

        if (geometries.length == 1) {
            return geometries[0];
        }
        else if (geometries.length > 1) {
            return {
                'type': 'GeometryCollection',
                'geometries': geometries
            }
        }

        return undefined;
    }

    protected getGeoJson(west: number, east: number, north: number, south: number, forcePolygon: boolean): any {
        if (west === east && north === south) {
            return {
                'type': 'Point',
                'coordinates': [west, north]
            };
        }
        else if (west === east || north === south) {
            return {
                'type': 'LineString',
                'coordinates': [[west, north], [east, south]]
            };
        }
        else {
            return {
                'type': 'Envelope',
                'coordinates': [[west, north], [east, south]]
            };
        }
    }

    _getSpatialText(): string {
        let geoGraphicDescriptions = CswMapper.select('(./srv:SV_ServiceIdentification/srv:extent|./gmd:MD_DataIdentification/gmd:extent)/gmd:EX_Extent/gmd:geographicElement/gmd:EX_GeographicDescription', this.idInfo);
        let result = [];
        for(let i=0; i < geoGraphicDescriptions.length; i++)
        {
            let geoGraphicDescription = geoGraphicDescriptions[i];
            let geoGraphicCode = CswMapper.select('./gmd:geographicIdentifier/gmd:MD_Identifier/gmd:code/gco:CharacterString', geoGraphicDescription, true);
            if(geoGraphicCode)
                result.push(geoGraphicCode.textContent);
        }

        if(result){
            return result.join(", ");
        }

        return undefined;
    }

    _getCentroid(): object {
        let spatial = this.getSpatial();
        return GeoJsonUtils.getCentroid(<AllGeoJSON>spatial)?.geometry;
    }

    _getTemporal(): DateRange[] {
        let result: DateRange[] = [];

        let nodes = CswMapper.select('./gmd:MD_DataIdentification/gmd:extent/gmd:EX_Extent/gmd:temporalElement/gmd:EX_TemporalExtent/gmd:extent/gml:TimePeriod|./gmd:MD_DataIdentification/gmd:extent/gmd:EX_Extent/gmd:temporalElement/gmd:EX_TemporalExtent/gmd:extent/gml32:TimePeriod', this.idInfo);

        for (let i = 0; i < nodes.length; i++) {
            let begin = this.getTimeValue(nodes[i], 'begin');
            let end = this.getTimeValue(nodes[i], 'end');

            if (begin || end) {
                result.push({
                    gte: begin ? begin : undefined,
                    lte: end ? end : undefined
                });
            }
        }
        nodes = CswMapper.select('./gmd:MD_DataIdentification/gmd:extent/gmd:EX_Extent/gmd:temporalElement/gmd:EX_TemporalExtent/gmd:extent/gml:TimeInstant/gml:timePosition|./gmd:MD_DataIdentification/gmd:extent/gmd:EX_Extent/gmd:temporalElement/gmd:EX_TemporalExtent/gmd:extent/gml32:TimeInstant/gml32:timePosition', this.idInfo);

        let times = nodes.map(node => node.textContent);
        for (let i = 0; i < times.length; i++) {
            result.push({
                gte: new Date(times[i]),
                lte: new Date(times[i])
            });
        }

        if(result.length)
            return result;

        return undefined;
    }

    getTimeValue(node, beginOrEnd: 'begin' | 'end'): Date {
        let dateNode = CswMapper.select('./gml:' + beginOrEnd + 'Position|./gml32:' + beginOrEnd + 'Position', node, true);
        if (!dateNode) {
            dateNode = CswMapper.select('./gml:' + beginOrEnd + '/*/gml:timePosition|./gml32:' + beginOrEnd + '/*/gml32:timePosition', node, true);
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

    _getThemes() {
        // Return cached value, if present
        if (this.fetched.themes) return this.fetched.themes;

        let themes = []

        let xpath = './gmd:identificationInfo[1]/gmd:MD_DataIdentification/gmd:topicCategory/gmd:MD_TopicCategoryCode';
        let categories = CswMapper.select(xpath, this.record);
        let keywords = this.getKeywords();

        if(categories && categories.length > 0){
            themes = this.mapCategoriesToThemes(categories, keywords);
        }

        keywords.filter(keyword => BaseMapper.DCAT_THEMES.includes(keyword)).forEach(keyword => themes.push(BaseMapper.DCAT_CATEGORY_URL + keyword));

        themes = themes.concat(CswMapper.select(xpath, this.record)
            .map(node => CswMapper.dcatThemeUriFromKeyword(node.textContent))
            .filter(theme => theme)); // Filter out falsy values

        // Evaluate the themes
        xpath = './gmd:identificationInfo/gmd:MD_DataIdentification/gmd:descriptiveKeywords/gmd:MD_Keywords[./gmd:thesaurusName/gmd:CI_Citation/gmd:title/gco:CharacterString/text()="Data theme (EU MDR)"]/gmd:keyword/gco:CharacterString';
        themes = themes.concat(CswMapper.select(xpath, this.record)
            .map(node => CswMapper.dcatThemeUriFromKeyword(node.textContent))
            .filter(theme => theme)); // Filter out falsy values

        if (!themes || themes.length === 0) {
            // Fall back to default value
            themes = this.settings.defaultDCATCategory
                .map(category => BaseMapper.DCAT_CATEGORY_URL + category);
        }

        themes = themes.filter((keyword, index, self) => self.indexOf(keyword) === index);

        this.fetched.themes = themes;
        return themes;
    }

    protected mapCategoriesToThemes(categories, keywords): string[]{
        let themes: string[] = [];

        categories.map(category => category.textContent).forEach(category => {
            switch (category) {

                case "farming":
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'AGRI');
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'ENVI');
                    break;
                case "biota":
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'ENVI');
                    break;
                case "boundaries":
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'REGI');
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'GOVE');
                    break;
                case "climatologyMeteorology Atmosphere":
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'ENVI');
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'TECH');
                    break;
                case "economy":
                    themes.push('ECON');
                    if (keywords.includes("Energiequellen")) {
                        themes.push(BaseMapper.DCAT_CATEGORY_URL + 'ENER');
                        themes.push(BaseMapper.DCAT_CATEGORY_URL + 'ENVI');
                        themes.push(BaseMapper.DCAT_CATEGORY_URL + 'TECH');
                    }
                    if (keywords.includes("Mineralische Bodenschätze")) {
                        themes.push(BaseMapper.DCAT_CATEGORY_URL + 'ENVI');
                        themes.push(BaseMapper.DCAT_CATEGORY_URL + 'TECH');
                    }
                    break;
                case "elevation":
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'ENVI');
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'GOVE');
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'TECH');
                    break;
                case "environment":
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'ENVI');
                    break;
                case "geoscientificInformation":
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'REGI');
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'ENVI');
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'TECH');
                    break;
                case "health":
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'HEAL');
                    break;
                case "imageryBaseMapsEarthCover ":
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'ENVI');
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'GOVE');
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'TECH');
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'REGI');
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'AGRI');
                    break;
                case "intelligenceMilitary":
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'JUST');
                    break;
                case "inlandWaters":
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'ENVI');
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'TRAN');
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'AGRI');
                    break;
                case "location":
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'REGI');
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'GOVE');
                    break;
                case "oceans":
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'ENVI');
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'TRAN');
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'AGRI');
                    break;
                case "planningCadastre":
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'REGI');
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'GOVE');
                    if (keywords.includes("Flurstücke/Grundstücke")) {
                        themes.push(BaseMapper.DCAT_CATEGORY_URL + 'JUST');
                    }
                    break;
                case "society":
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'SOCI');
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'EDUC');
                    break;
                case "structure":
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'REGI');
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'TRAN');
                    if (keywords.includes("Produktions- und Industrieanlagen")) {
                        themes.push(BaseMapper.DCAT_CATEGORY_URL + 'ECON');
                    }
                    if (keywords.includes("Umweltüberwachung")) {
                        themes.push(BaseMapper.DCAT_CATEGORY_URL + 'ENVI');
                    }
                    break;
                case "transportation":
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'TRAN');
                    break;
                case "utilitiesCommunication":
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'ENER');
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'ENVI');
                    themes.push(BaseMapper.DCAT_CATEGORY_URL + 'GOVE');
                    break;
            }
        });

        return themes;
    }

    _isRealtime(): boolean {
        return undefined;
    }

    static getCharacterStringContent(element, cname?): string {
        if (cname) {
            return CswMapper.select(`./gmd:${cname}/gco:CharacterString`, element, true)?.textContent;
        }
        else {
            return CswMapper.select(`./gco:CharacterString`, element, true)?.textContent;
        }
    }

    _getAccrualPeriodicity(): string {
        // Multiple resourceMaintenance elements are allowed. If present, use the first one
        let freq = CswMapper.select('./*/gmd:resourceMaintenance/*/gmd:maintenanceAndUpdateFrequency/gmd:MD_MaintenanceFrequencyCode', this.idInfo);
        if (freq.length > 0) {
            let periodicity = DcatPeriodicityUtils.getPeriodicity(freq[0].getAttribute('codeListValue'))
            if(!periodicity){
                this.summary.warnings.push(["Unbekannte Periodizität", freq[0].getAttribute('codeListValue')]);
            }
            return periodicity;
        }
        return undefined;
    }

    async _getLicense() {
        let license: License;
        let constraints = CswMapper.select('./*/gmd:resourceConstraints/*[./gmd:useConstraints/gmd:MD_RestrictionCode/@codeListValue="license" or ./gmd:useConstraints/gmd:MD_RestrictionCode/@codeListValue="otherRestrictions"]', this.idInfo);

        if (constraints && constraints.length > 0) {
            for (let j = 0; j < constraints.length; j++) {
                let c = constraints[j];
                let nodes = CswMapper.select('./gmd:otherConstraints', c);
                for (let i = 0; i < nodes.length; i++) {
                    let text = CswMapper.getCharacterStringContent(nodes[i]);
                    try {
                        let json = JSON.parse(text);

                        if (!json.id || !json.url) continue;

                        license = await DcatLicensesUtils.get(json.url);
                        if (!license) {
                            let requestConfig = this.getUrlCheckRequestConfig(json.url);
                            license = {
                                id: json.id,
                                title: json.name,
                                url: await UrlUtils.urlWithProtocolFor(requestConfig, this.settings.skipUrlCheckOnHarvest)
                            };
                        }
                    } catch (ignored) {
                    }
                }
            }
        }

        if (!license) {
            let msg = `No license detected for dataset. ${this.getErrorSuffix(this.uuid, this.getTitle())}`;
            this.summary.missingLicense++;

            this.log.warn(msg);
            this.summary.warnings.push(['Missing license', msg]);
            return {
                id: 'unknown',
                title: 'Unbekannt',
                url: undefined
            };
        }

        return license;
    }

    getErrorSuffix(uuid, title) {
        return `Id: '${uuid}', title: '${title}', source: '${this.settings.getRecordsUrl}'.`;
    }

    _getHarvestedData(): string {
        return this.record.toString();
    }

    _getCreator(): Person[] {
        let creators = [];
        // Look up contacts for the dataset first and then the metadata contact
        let queries = [
            './gmd:identificationInfo/gmd:MD_DataIdentification/gmd:pointOfContact/gmd:CI_ResponsibleParty',
            './gmd:contact/gmd:CI_ResponsibleParty'
        ];
        for (let i = 0; i < queries.length; i++) {
            let contacts = CswMapper.select(queries[i], this.record);
            for (let j = 0; j < contacts.length; j++) {
                let contact = contacts[j];
                let role = CswMapper.select('./gmd:role/gmd:CI_RoleCode/@codeListValue', contact, true).textContent;

                let name = CswMapper.select('./gmd:individualName/gco:CharacterString', contact, true);
                let organisation = CswMapper.select('./gmd:organisationName/gco:CharacterString', contact, true);
                let email = CswMapper.select('./gmd:contactInfo/gmd:CI_Contact/gmd:address/gmd:CI_Address/gmd:electronicMailAddress/gco:CharacterString', contact, true);

                if (role === 'originator' || role === 'author') {
                    let creator: creatorType = {};
                    /*
                     * Creator has only one field for name. Use either the name
                     * of the organisation or the person for this field. The
                     * organisation name has a higher priority.
                     */
                    if (organisation) {
                        creator.name = organisation.textContent;
                    } else if (name) {
                        creator.name = name.textContent;
                    }
                    if (email) creator.mbox = email.textContent;

                    let alreadyPresent = creators.filter(c => c.name === creator.name && c.mbox === creator.mbox).length > 0;
                    if (!alreadyPresent) {
                        creators.push(creator);
                    }
                }
            }
        }
        return creators.length === 0 ? undefined : creators;
    }


    _getGroups(): string[] {
        return undefined;
    }

    _getIssued(): Date {
        return undefined;
    }

    _getLanguage(): string {
        let language = CswMapper.select('./gmd:language/gmd:LanguageCode/@codeListValue', this.record, true)?.textContent;
        return language && language.trim() !== '' ? language : undefined;
    }

    _getMetadataHarvested(): Date {
        return new Date(Date.now());
    }

    _getSubSections(): any[] {
        return undefined;
    }

    _getOriginator(): Person[] {

        let originators: any[] = [];

        let queries = [
            './gmd:identificationInfo/gmd:MD_DataIdentification/gmd:pointOfContact/gmd:CI_ResponsibleParty',
            './gmd:contact/gmd:CI_ResponsibleParty'
        ];
        for (let i = 0; i < queries.length; i++) {
            let contacts = CswMapper.select(queries[i], this.record);
            for (let j = 0; j < contacts.length; j++) {
                let contact = contacts[j];
                let role = CswMapper.select('./gmd:role/gmd:CI_RoleCode/@codeListValue', contact, true).textContent;

                if (role === 'originator') {
                    let name = CswMapper.select('./gmd:individualName/gco:CharacterString', contact, true);
                    let org = CswMapper.select('./gmd:organisationName/gco:CharacterString', contact, true);
                    let email = CswMapper.select('./gmd:contactInfo/gmd:CI_Contact/gmd:address/gmd:CI_Address/gmd:electronicMailAddress/gco:CharacterString', contact, true);
                    let url = CswMapper.select('./gmd:contactInfo/gmd:CI_Contact/gmd:onlineResource/gmd:CI_OnlineResource/gmd:linkage/gmd:URL', contact, true);

                    if (!name && !org) continue;

                    let originator: Agent = {
                        homepage: url ? url.textContent : undefined,
                        mbox: email ? email.textContent : undefined
                    };
                    if (name) {
                        (<Person>originator).name = name.textContent
                    } else {
                        (<Organization>originator).organization = org.textContent
                    }

                    let alreadyPresent = originators.filter(other => {
                        return other.name === (<Person>originator).name
                            && other.organization === (<Organization>originator).organization
                            && other.mbox === originator.mbox
                            && other.homepage === originator.homepage;
                    }).length > 0;
                    if (!alreadyPresent) {
                        originators.push(originator);
                    }
                }
            }
        }

        return originators.length > 0 ? originators : undefined;
    }

    async _getContactPoint(): Promise<Contact> {

        let contactPoint = this.fetched.contactPoint;
        if (contactPoint) {
            return contactPoint;
        }
        let contacts = await this._getContactPoints();
        contacts = contacts.filter(extContact => !['originator', 'author', 'publisher'].includes(extContact.role));
        for (let extContact of contacts) {
            delete extContact['role'];
        }
        contactPoint = contacts.length === 0 ? undefined : contacts[0];
        this.fetched.contactPoint = contactPoint;
        return contactPoint; // TODO index all contacts
    }

    async _getContactPoints(): Promise<(Contact & { role?: string })[]> {
        let others = [];
        // Look up contacts for the dataset first and then the metadata contact
        let queries = [
            './gmd:identificationInfo/gmd:MD_DataIdentification/gmd:pointOfContact/gmd:CI_ResponsibleParty',
            './gmd:contact/gmd:CI_ResponsibleParty'
        ];
        for (let i = 0; i < queries.length; i++) {
            let contacts = CswMapper.select(queries[i], this.record);
            for (let j = 0; j < contacts.length; j++) {
                let contact = contacts[j];
                let role = CswMapper.select('./gmd:role/gmd:CI_RoleCode/@codeListValue', contact, true).textContent;
                let name = CswMapper.select('./gmd:individualName/gco:CharacterString', contact, true);
                let org = CswMapper.select('./gmd:organisationName/gco:CharacterString', contact, true);
                let delPt = CswMapper.select('./gmd:contactInfo/gmd:CI_Contact/gmd:address/gmd:CI_Address/gmd:deliveryPoint', contact);
                let locality = CswMapper.select('./gmd:contactInfo/gmd:CI_Contact/gmd:address/gmd:CI_Address/gmd:city/gco:CharacterString', contact, true);
                let region = CswMapper.select('./gmd:contactInfo/gmd:CI_Contact/gmd:address/gmd:CI_Address/gmd:administrativeArea/gco:CharacterString', contact, true);
                let country = CswMapper.select('./gmd:contactInfo/gmd:CI_Contact/gmd:address/gmd:CI_Address/gmd:country/gco:CharacterString', contact, true);
                let postCode = CswMapper.select('./gmd:contactInfo/gmd:CI_Contact/gmd:address/gmd:CI_Address/gmd:postalCode/gco:CharacterString', contact, true);
                let email = CswMapper.select('./gmd:contactInfo/gmd:CI_Contact/gmd:address/gmd:CI_Address/gmd:electronicMailAddress/gco:CharacterString', contact, true);
                let phone = CswMapper.select('./gmd:contactInfo/gmd:CI_Contact/gmd:phone/gmd:CI_Telephone/gmd:voice/gco:CharacterString', contact, true);
                let urlNode = CswMapper.select('./gmd:contactInfo/gmd:CI_Contact/gmd:onlineResource/gmd:CI_OnlineResource/gmd:linkage/gmd:URL', contact, true);
                let url = null;
                if (urlNode) {
                    let requestConfig = this.getUrlCheckRequestConfig(urlNode.textContent);
                    url = await UrlUtils.urlWithProtocolFor(requestConfig, this.settings.skipUrlCheckOnHarvest);
                }

                let infos: Contact & { role?: string } = {
                    fn: name?.textContent,
                };

                if (contact.getAttribute('uuid')) {
                    infos.hasUID = contact.getAttribute('uuid');
                }

                if (!infos.fn) infos.fn = org?.textContent;
                if (org) infos['organization-name'] = org.textContent;                    

                let line1 = delPt.map(n => CswMapper.getCharacterStringContent(n));
                line1 = line1.join(', ');
                if (line1) infos.hasStreetAddress = line1;
                if (locality?.textContent) infos.hasLocality = locality.textContent;
                if (region?.textContent) infos.hasRegion = region.textContent;
                if (country?.textContent) infos.hasCountryName = country.textContent;
                if (postCode?.textContent) infos.hasPostalCode = postCode.textContent;

                if (email) infos.hasEmail = email.textContent;
                if (phone) infos.hasTelephone = phone.textContent;
                if (url) infos.hasURL = url;

                infos.role = role;

                others.push(infos);
            }
        }
        return others;
    }

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
