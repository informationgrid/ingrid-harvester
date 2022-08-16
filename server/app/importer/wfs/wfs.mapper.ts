/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2021 wemove digital solutions GmbH
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
import {Agent, DateRange, Distribution, GenericMapper, Organization, Person} from "../../model/generic.mapper";
import {License} from '@shared/license.model';
import {getLogger} from "log4js";
import {UrlUtils} from "../../utils/url.utils";
import {RequestDelegate} from "../../utils/http-request.utils";
import {WfsImporter, WfsSummary} from "./wfs.importer";
import {OptionsWithUri} from "request-promise";
import {WfsSettings} from './wfs.settings';
import {throwError} from "rxjs";
import doc = Mocha.reporters.doc;
import {ImporterSettings} from "../../importer.settings";
import {DcatPeriodicityUtils} from "../../utils/dcat.periodicity.utils";
import {DcatLicensesUtils} from "../../utils/dcat.licenses.utils";
import {ExportFormat} from "../../model/index.document";
import {Summary} from "../../model/summary";
import { GeoJsonUtils } from "../../utils/geojson.utils";
import { DcatApPluFactory } from "../DcatApPluFactory";
import { XPathUtils } from "../../utils/xpath.utils";

// const ogr2ogr = require('ogr2ogr').default
// const gmlParser = require('parse-gml-polygon');
const proj4 = require('proj4');
const xpath = require('xpath');

export class WfsMapper extends GenericMapper {

    static FIS = 'http://www.berlin.de/broker';
    // static GMD = 'http://www.isotc211.org/2005/gmd';
    // static GCO = 'http://www.isotc211.org/2005/gco';
    static GML = 'http://www.opengis.net/gml';
    static GML_3_2 = 'http://www.opengis.net/gml/3.2';
    // static CSW = 'http://www.opengis.net/cat/csw/2.0.2';
    static PLU = 'here goes the custom PLU URL';
    // static SRV = 'http://www.isotc211.org/2005/srv';
    static RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
    static RDFS = 'http://www.w3.org/2000/01/rdf-schema#';
    static DCAT = 'http://www.w3.org/ns/dcat#';
    static DCT = 'http://purl.org/dc/terms/';
    static WFS_1_1 = 'http://www.opengis.net/wfs';
    static WFS_2_0 = 'http://www.opengis.net/wfs/2.0';
    static XPLAN_5_1 = 'http://www.xplanung.de/xplangml/5/1';
    static XPLAN_5_2 = 'http://www.xplanung.de/xplangml/5/2';
    static XPLAN_5_3 = 'http://www.xplanung.de/xplangml/5/3';
    static XPLAN_5_4 = 'http://www.xplanung.de/xplangml/5/4';
    static VCARD = 'http://www.w3.org/2006/vcard/ns#';

    static nsMap = {
        'fis': WfsMapper.FIS,
        // 'gml': WfsMapper.GML,
        'gml': WfsMapper.GML_3_2,
        'wfs11': WfsMapper.WFS_1_1,
        'wfs': WfsMapper.WFS_2_0,
        'xplan': WfsMapper.XPLAN_5_1,
    };

    static select = xpath.useNamespaces(WfsMapper.nsMap);
    static geojsonUtils = new GeoJsonUtils(WfsMapper.nsMap);

    private log = getLogger();

    private readonly feature: any;
    private harvestTime: any;
    private readonly storedData: any;

    // protected readonly idInfo; // : SelectedValue;
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


    constructor(settings, feature, harvestTime, storedData, summary, contactPoint, boundingBox) {
        super();
        this.settings = settings;
        this.feature = feature;
        this.harvestTime = harvestTime;
        this.storedData = storedData;
        this.summary = summary;
        this.fetched.boundingBox = boundingBox;
        this.fetched.contactPoint = contactPoint;

        // this.uuid = WfsMapper.getCharacterStringContent(feature, 'fileIdentifier');
        // this.uuid = feature.firstChildElement.getAttribute(this.settings.gmlVersion, 'id');
        // this.uuid = WfsMapper.select(settings.xpaths.id, feature);
        // TODO:check
        let typenames = settings.typename.split(',');
        for (let typename of typenames) {
            let idElem = WfsMapper.select(`.//${typename}/@gml:id`, feature, true);
            if (idElem != null) {
                this.uuid = idElem.textContent;
                break;
            }
        }

        super.init();
    }

    protected getSettings(): ImporterSettings {
        return this.settings;
    }

    protected getSummary(): Summary {
        return this.summary;
    }

    // TODO:check
    _getDescription() {
        let abstract = WfsMapper.select(this.settings.xpaths.description, this.feature, true)?.textContent || "just a default value";
        // let abstract = WfsMapper.getCharacterStringContent(this.idInfo, 'abstract');
        if (!abstract) {
            let msg = `Dataset doesn't have an abstract. It will not be displayed in the portal. Id: \'${this.uuid}\', title: \'${this.getTitle()}\', source: \'${this.settings.getFeaturesUrl}\'`;
            this.log.warn(msg);
            this.summary.warnings.push(['No description', msg]);
            this.valid = false;
        }

        return abstract;
    }

    // TODO
    async _getDistributions(): Promise<Distribution[]> {
        let dists = [];
        let urlsFound = [];
        // let srvIdent = WfsMapper.select('./srv:SV_ServiceIdentification', this.idInfo, true);
        // if (srvIdent) {
        //     dists = await this.handleDistributionforService(srvIdent, urlsFound);
        // }

        // let distNodes = WfsMapper.select('./gmd:distributionInfo/gmd:MD_Distribution', this.feature);
        // for (let i = 0; i < distNodes.length; i++) {
        //     let distNode = distNodes[i];
        //     let id = distNode.getAttribute('id');
        //     if (!id) id = distNode.getAttribute('uuid');

        //     let formats = [];
        //     let urls: Distribution[] = [];

        //     WfsMapper.select('.//gmd:MD_Format/gmd:name/gco:CharacterString', distNode).forEach(format => {
        //         format.textContent.split(',').forEach(formatItem => {
        //             if (!formats.includes(formatItem)) {
        //                 formats.push(formatItem.trim());
        //             }
        //         });
        //     });

        //     // Combine formats in a single slash-separated string
        //     if (formats.length === 0) formats.push('Unbekannt');

        //     let onlineResources = WfsMapper.select('.//gmd:MD_DigitalTransferOptions/gmd:onLine/gmd:CI_OnlineResource', distNode);
        //     for (let j = 0; j < onlineResources.length; j++) {
        //         let onlineResource = onlineResources[j];

        //         let urlNode = WfsMapper.select('gmd:linkage/gmd:URL', onlineResource);
        //         let title = WfsMapper.select('gmd:name/gco:CharacterString', onlineResource);
        //         let protocolNode = WfsMapper.select('gmd:protocol/gco:CharacterString', onlineResource);

        //         let url = null;
        //         if (urlNode.length > 0) {
        //             let requestConfig = this.getUrlCheckRequestConfig(urlNode[0].textContent);
        //             url = await UrlUtils.urlWithProtocolFor(requestConfig);
        //         }
        //         if (url && !urls.includes(url)) {
        //             const formatArray = protocolNode.length > 0 && protocolNode[0].textContent
        //                 ? [protocolNode[0].textContent]
        //                 : formats;

        //             urls.push({
        //                 accessURL: url,
        //                 title: title.length > 0 ? title[0].textContent : undefined,
        //                 format: UrlUtils.mapFormat(formatArray, this.summary.warnings)
        //             });
        //         }
        //     }

        //     // Filter out URLs that have already been found
        //     urls = urls.filter(item => !urlsFound.includes(item.accessURL));

        //     // Set id only if there is a single resource
        //     if (urls.length === 1 && id) urls[0].id = id;

        //     // add distributions to all
        //     dists.push(...urls);
        // }

        return dists;
    }

    // TODO
    async handleDistributionforService(srvIdent, urlsFound): Promise<Distribution[]> {

        let getCapabilitiesElement = WfsMapper.select(
            // convert containing text to lower case
            './srv:containsOperations/srv:SV_OperationMetadata[./srv:operationName/gco:CharacterString/text()[contains(translate(\'GetCapabilities\', \'ABCEGILPST\', \'abcegilpst\'), "getcapabilities")]]/srv:connectPoint/*/gmd:linkage/gmd:URL',
            srvIdent,
            true);
        let getCapablitiesUrl = getCapabilitiesElement ? getCapabilitiesElement.textContent : null;
        let serviceFormat = WfsMapper.select('.//srv:serviceType/gco:LocalName', srvIdent, true);
        let serviceTypeVersion = WfsMapper.select('.//srv:serviceTypeVersion/gco:CharacterString', srvIdent);
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


        let operations = WfsMapper
            .select('./srv:containsOperations/srv:SV_OperationMetadata', srvIdent);

        for (let i = 0; i < operations.length; i++) {
            let onlineResource = WfsMapper.select('./srv:connectPoint/gmd:CI_OnlineResource', operations[i], true);

            if(onlineResource) {
                let urlNode = WfsMapper.select('gmd:linkage/gmd:URL', onlineResource, true);
                let protocolNode = WfsMapper.select('gmd:protocol/gco:CharacterString', onlineResource, true);

                let title = this.getTitle();

                let operationNameNode = WfsMapper.select('srv:operationName/gco:CharacterString', operations[i], true);
                if(operationNameNode){
                    title = title + " - " + operationNameNode.textContent;
                }

                let requestConfig = this.getUrlCheckRequestConfig(urlNode.textContent);
                let url = await UrlUtils.urlWithProtocolFor(requestConfig);
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

    // TODO
    async _getPublisher(): Promise<any[]> {
        let publishers = [];
        // Look up contacts for the dataset first and then the metadata contact
        // let queries = [
        //     './gmd:identificationInfo/*/gmd:pointOfContact/gmd:CI_ResponsibleParty',
        //     './gmd:contact/gmd:CI_ResponsibleParty'
        // ];
        // for (let i = 0; i < queries.length; i++) {
        //     let contacts = WfsMapper.select(queries[i], this.feature);
        //     for (let j = 0; j < contacts.length; j++) {
        //         let contact = contacts[j];
        //         let role = WfsMapper.select('./gmd:role/gmd:CI_RoleCode/@codeListValue', contact, true).textContent;

        //         let name = WfsMapper.select('./gmd:individualName/gco:CharacterString', contact, true);
        //         let org = WfsMapper.select('./gmd:organisationName/gco:CharacterString', contact, true);
        //         let urlNode = WfsMapper.select('./gmd:contactInfo/*/gmd:onlineResource/*/gmd:linkage/gmd:URL', contact, true);

        //         let url = null;
        //         if (urlNode) {
        //             let requestConfig = this.getUrlCheckRequestConfig(urlNode.textContent);
        //             url = await UrlUtils.urlWithProtocolFor(requestConfig);
        //         }

        //         if (role === 'publisher') {
        //             let infos: any = {};

        //             if (name) infos.name = name.textContent;
        //             if (url) infos.homepage = url;
        //             if (org) infos.organization = org.textContent;

        //             publishers.push(infos);
        //         }
        //     }
        // }

        if (publishers.length === 0) {
            this.summary.missingPublishers++;
            return undefined;
        } else {
            return publishers;
        }
    }

    // TODO:check
    _getTitle() {
        let title;
        let typenames = this.settings.typename.split(',');
        for (let typename of typenames) {
            title = WfsMapper.select(`.//${typename}${this.settings.xpaths.name}`, this.feature, true);
            if (title != null) {
                title = title.textContent;
                break;
            }
        }
        // this.settings.xpaths.name
        // let title = WfsMapper.select('/xplan:name', this.feature, true)?.textContent;
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

                if (publisher[0].organization) {
                    displayName = publisher[0].organization;
                } else if (publisher[0].name) {
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

    // TODO:check
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
        // return new Date(WfsMapper.select('./gmd:dateStamp/gco:Date|./gmd:dateStamp/gco:DateTime', this.feature, true).textContent);
    }

    // TODO do we need this?
    _getBoundingBox(): any {
        if (this.fetched.boundingBox) {
            return this.fetched.boundingBox;
        }

        let boundingBox = {};
        let lowerCorner = WfsMapper.select('(./gml:boundedBy/*/gml:lowerCorner/text()', this.feature).trim().split(' ');
        let upperCorner = WfsMapper.select('(./gml:boundedBy/*/gml:upperCorner/text()', this.feature).trim().split(' ');
        let west = parseFloat(lowerCorner[1]);;
        let east = parseFloat(upperCorner[1]);
        let south = parseFloat(lowerCorner[0]);
        let north = parseFloat(upperCorner[0]);;

        if (west === east && north === south) {
            boundingBox = {
                'type': 'point',
                'coordinates': [west, north]
            };
        } else if (west === east || north === south) {
            boundingBox = {
                'type': 'linestring',
                'coordinates': [[west, north], [east, south]]
            };
        } else {
            boundingBox = {
                'type': 'envelope',
                'coordinates': [[west, north], [east, south]]
            };
        }
        return boundingBox;
    }

    _getSpatialGml(): any {
        let spatialContainer = WfsMapper.select(this.settings.xpaths.spatial, this.feature, true);
        let child = XPathUtils.firstElementChild(spatialContainer);
        return child.toString();
    }

    // TODO:check
    _getSpatial(): any {
        // console.log("spat");
        // console.log(this.settings.xpaths.spatial);
        // console.log(`${this.settings.xpaths.spatial}/gml:Polygon/gml:exterior/gml:LinearRing/gml:posList`);
        // console.log(WfsMapper.select(`${this.settings.xpaths.spatial}/gml:Polygon/gml:exterior/gml:LinearRing/gml:posList`, this.feature));
        // return {
        //     'mäh': 'mäh'
        // }

        // ED: close, but no cigar - tbh, not even close
        // function handlePolygon(polygonElement) {
        //     let posListElem = WfsMapper.select("//gml:exterior/*/gml:posList", polygonElement, true);
        //     let polygon = posListElem.textContent.split(' ');
        //     let polygonArr = [];
        //     for (let i = 0; i < polygon.length/2; i += 2) {
        //         polygonArr.push([parseFloat(polygon[i]), parseFloat(polygon[i+1])]);
        //     }
        //     // TODO: invalid LinearRing provided for type polygon. Linear ring must be an array of coordinates
        //     // this signals the requirement that the first and last coordinates must be the same
        //     // -> we copy the first coordinate to the end if they're not the same
        //     if (posListElem.parentNode.localName === 'LinearRing' && polygonArr[0] != polygonArr[polygonArr.length - 1]) {
        //         polygonArr.push(polygonArr[0]);
        //     }
        //     else {
        //         throwError(`Unrecognized polygon type: ${posListElem.parentNode.localName}`);
        //     }
        //     return polygonArr;
        // }
        let spatialContainer = WfsMapper.select(this.settings.xpaths.spatial, this.feature, true);
        let child = XPathUtils.firstElementChild(spatialContainer);

        // TODO how to get those definitions automatically from epsg.org or epsg.io?
        // probably best to save these (or only those that occur?) to a CRS.CONFIG file
        // get the ones that are used from GetCapabilities at the start of the harvest
        proj4.defs('EPSG:25832', "+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs");
        // TODO how to determine automatically?
        // for XPLAN just use the srsName attribute; for fis, it's encoded in the element name
        let crs = 'EPSG:25832';
        let transformer = (x, y) => proj4(crs, 'WGS84').forward([x, y]);
        let geojson = WfsMapper.geojsonUtils.parse(child, { transformCoords: transformer });
        // return geojson;
        return {    
            "type": "Point",
            "coordinates": [
                -105.01621,
                39.57422
        ]
          };
        // let coordinates = [];
        // switch (child.localName) {
        //     // TODO handle multisurface
        //     case 'MultiSurface':
        //         let polygonElements = WfsMapper.select('//gml:Polygon', child, false);
        //         for (let polygonElement of polygonElements) {
        //             coordinates.push(gmlParser(polygonElement));
        //             console.log("CHILD:", gmlParser(child))
        //         }
        //         return {
        //             'type': 'MultiPolygon',
        //             'coordinates': coordinates
        //         };
        //     // TODO handle polygon
        //     case 'Polygon':
        //         coordinates.push(gmlParser(child));
        //         console.log("CHILD:", gmlParser(child))
        //         return {
        //             'type': 'Polygon',
        //             'coordinates': coordinates
        //         };
        //     default:
        //         // TODO is there more?
        //         throwError(`Currently not handling spatial info from ${child.localName}.`);
        //         break;
        // }

        // let polygon = WfsMapper.select(`${this.settings.xpaths.spatial}/gml:Polygon/gml:exterior/gml:LinearRing/gml:posList`, this.feature, true)?.textContent?.split(' ') ?? [];
        // let polygonArr = [];
        // for (let i = 0; i < polygon.length/2; i += 2) {
        //     polygonArr.push([parseFloat(polygon[i]), parseFloat(polygon[i+1])]);
        // }

        // // TODO: invalid LinearRing provided for type polygon. Linear ring must be an array of coordinates
        // // this signals the requirement that the first and last coordinates must be the same
        // // -> we copy the first coordinate to the end if they're not the same
        // if (polygonArr[0] != polygonArr[polygonArr.length - 1]) {
        //     polygonArr.push(polygonArr[0]);
        // }

        // // TODO we receive following error on import
        // // illegal_argument_exception: Unable to Tessellate shape [...]. Possible malformed shape detected.

        // return {
        //     'type': 'Polygon',
        //     'coordinates': [ polygonArr ]
        // };

        // let spatialContainer = WfsMapper.select(this.settings.xpaths.spatial, this.feature, true);
        // let child = WfsImporter.getFirstElementChild(spatialContainer);

        // let stream = new Readable();
        // stream.push(child.content);
        // stream.push(null);

        // let options = {};
        // if (child.getAttribute('srsName')) {
        //     options['-t_srs'] = child.getAttribute('srsName');
        // }
        // let text = await ogr2ogr(stream, options);
        // console.log("TEXT");
        // console.log(text);
        // return text;
        // return undefined;
    }

    // TODO
    _getSpatialText(): string {
        // let geoGraphicDescriptions = WfsMapper.select('(./srv:SV_ServiceIdentification/srv:extent|./gmd:MD_DataIdentification/gmd:extent)/gmd:EX_Extent/gmd:geographicElement/gmd:EX_GeographicDescription', this.idInfo);
        // let result = [];
        // for(let i=0; i < geoGraphicDescriptions.length; i++)
        // {
        //     let geoGraphicDescription = geoGraphicDescriptions[i];
        //     let geoGraphicCode = WfsMapper.select('./gmd:geographicIdentifier/gmd:MD_Identifier/gmd:code/gco:CharacterString', geoGraphicDescription, true);
        //     if(geoGraphicCode)
        //         result.push(geoGraphicCode.textContent);
        // }

        // if(result){
        //     return result.join(", ");
        // }

        return undefined;
    }

    // TODO
    _getTemporal(): DateRange[] {
        // let suffix = this.getErrorSuffix(this.uuid, this.getTitle());

        // let result: DateRange[] = [];

        // let nodes = WfsMapper.select('./*/gmd:extent/*/gmd:temporalElement/*/gmd:extent/gml:TimePeriod|./*/gmd:extent/*/gmd:temporalElement/*/gmd:extent/gml32:TimePeriod', this.idInfo);

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
        // nodes = WfsMapper.select('./*/gmd:extent/*/gmd:temporalElement/*/gmd:extent/gml:TimeInstant/gml:timePosition|./*/gmd:extent/*/gmd:temporalElement/*/gmd:extent/gml32:TimeInstant/gml32:timePosition', this.idInfo);

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
        let dateNode = WfsMapper.select('./gml:' + beginOrEnd + 'Position|./gml32:' + beginOrEnd + 'Position', node, true);
        if (!dateNode) {
            dateNode = WfsMapper.select('./gml:' + beginOrEnd + '/*/gml:timePosition|./gml32:' + beginOrEnd + '/*/gml32:timePosition', node, true);
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

    // static getCharacterStringContent(ns, element, cname?): string {
    //     if (cname) {
    //         let node = WfsMapper.select(`.//gmd:${cname}/gco:CharacterString`, element, true);
    //         if (node) {
    //             return node.textContent;
    //         }
    //     } else {
    //         let node = WfsMapper.select('./gco:CharacterString', element, true);
    //         return node ? node.textContent : null;
    //     }
    // }

    // TODO
    _getAccrualPeriodicity(): string {
        // Multiple resourceMaintenance elements are allowed. If present, use the first one
        // let freq = WfsMapper.select('./*/gmd:resourceMaintenance/*/gmd:maintenanceAndUpdateFrequency/gmd:MD_MaintenanceFrequencyCode', this.idInfo);
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
        return `Id: '${uuid}', title: '${title}', source: '${this.settings.getFeaturesUrl}'.`;
    }

    // TODO
    _getHarvestedData(): string {
        return this.feature.toString();
    }

    // TODO
    async _getTransformedData(format: string): Promise<string> {
        switch(format) {
            case ExportFormat.DCAT_AP_PLU:
                return this.wfsToDcatApPlu();
            default:
                return '';
        }
    }

    // TODO
    async wfsToDcatApPlu(): Promise<string> {
        return DcatApPluFactory.createXml({
            catalog: {
                description: '',
                title: '',
                publisher: {
                    name: ''
                }
            }, 
            contactPoint: {
                address: '',
                country: '',
                email: '',
                locality: '',
                orgName: '',
                phone: '',
                postalCode: ''
            }, 
            // contributors: null,
            descriptions: [this._getDescription()], 
            // distributions: null,
            // geographicName: null,
            identifier: this.uuid,
            issued: this._getIssued(),
            // TODO where to infer the language from?
            lang: 'de',
            locationXml: this._getSpatialGml(),
            // maintainers: null,
            modified: this._getModifiedDate(),
            namespaces: WfsMapper.nsMap,
            planState: null,
            // pluPlanType: null,
            // pluPlanTypeFine: null,
            pluProcedureState: null,
            // pluProcedureType: null,
            // pluProcessSteps: null,
            procedureStartDate: null,
            publisher: {
                name: ''
            },
            relation: null,
            title: this._getTitle()
        });
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
        //     let contacts = WfsMapper.select(queries[i], this.feature);
        //     for (let j = 0; j < contacts.length; j++) {
        //         let contact = contacts[j];
        //         let role = WfsMapper.select('./gmd:role/gmd:CI_RoleCode/@codeListValue', contact, true).textContent;

        //         let name = WfsMapper.select('./gmd:individualName/gco:CharacterString', contact, true);
        //         let organisation = WfsMapper.select('./gmd:organisationName/gco:CharacterString', contact, true);
        //         let email = WfsMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:electronicMailAddress/gco:CharacterString', contact, true);

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

    _getIssued(): Date {
        return undefined;
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
        //     let contacts = WfsMapper.select(queries[i], this.feature);
        //     for (let j = 0; j < contacts.length; j++) {
        //         let contact = contacts[j];
        //         let role = WfsMapper.select('./gmd:role/gmd:CI_RoleCode/@codeListValue', contact, true).textContent;

        //         if (role === 'originator') {
        //             let name = WfsMapper.select('./gmd:individualName/gco:CharacterString', contact, true);
        //             let org = WfsMapper.select('./gmd:organisationName/gco:CharacterString', contact, true);
        //             let email = WfsMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:electronicMailAddress/gco:CharacterString', contact, true);
        //             let url = WfsMapper.select('./gmd:contactInfo/*/gmd:onlineResource/*/gmd:linkage/gmd:URL', contact, true);

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

    // TODO
    // ED: the features itself contain no contact information
    // we can scrape a little bit from GetCapabilities...
    async _getContactPoint(): Promise<any> {

        let contactPoint = this.fetched.contactPoint;
        if (contactPoint) {
            return contactPoint;
        }

        contactPoint = [];
        // // Look up contacts for the dataset first and then the metadata contact
        // let queries = [
        //     './gmd:identificationInfo/*/gmd:pointOfContact/gmd:CI_ResponsibleParty',
        //     './gmd:contact/gmd:CI_ResponsibleParty'
        // ];
        // for (let i = 0; i < queries.length; i++) {
        //     let contacts = WfsMapper.select(queries[i], this.feature);
        //     for (let j = 0; j < contacts.length; j++) {
        //         let contact = contacts[j];
        //         let role = WfsMapper.select('./gmd:role/gmd:CI_RoleCode/@codeListValue', contact, true).textContent;

        //         if (role !== 'originator' && role !== 'author' && role !== 'publisher') {
                    // let name = WfsMapper.select('./gmd:individualName/gco:CharacterString', feature, true);
                    // let org = WfsMapper.select('./gmd:organisationName/gco:CharacterString', contact, true);
                    // let delPt = WfsMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:deliveryPoint', contact);
                    // let region = WfsMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:administrativeArea/gco:CharacterString', contact, true);
                    // let country = WfsMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:country/gco:CharacterString', contact, true);
                    // let postCode = WfsMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:postalCode/gco:CharacterString', contact, true);
                    // let email = WfsMapper.select('./gmd:contactInfo/*/gmd:address/*/gmd:electronicMailAddress/gco:CharacterString', contact, true);
                    // let phone = WfsMapper.select('./gmd:contactInfo/*/gmd:phone/*/gmd:voice/gco:CharacterString', contact, true);
                    // let urlNode = WfsMapper.select('./gmd:contactInfo/*/gmd:onlineResource/*/gmd:linkage/gmd:URL', contact, true);
                    // let url = null;
                    // if (urlNode) {
                    //     let requestConfig = this.getUrlCheckRequestConfig(urlNode.textContent);
                    //     url = await UrlUtils.urlWithProtocolFor(requestConfig);
                    // }

                    let infos: any = {};

                    // if (contact.getAttribute('uuid')) {
                    //     infos.hasUID = contact.getAttribute('uuid');
                    // }

                    // if (name) infos.fn = name.textContent;
                    // if (org) infos['organization-name'] = org.textContent;

                    // let line1 = delPt.map(n => WfsMapper.getCharacterStringContent(n));
                    // line1 = line1.join(', ');
                    // if (line1) infos['street-address'] = line1;

                    // if (region) infos.region = region.textContent;
                    // if (country) infos['country-name'] = country.textContent;
                    // if (postCode) infos['postal-code'] = postCode.textContent;
                    // if (email) infos.hasEmail = email.textContent;
                    // if (phone) infos.hasTelephone = phone.textContent;
                    // if (url) infos.hasURL = url;

                    contactPoint.push(infos);
        //         }
        //     }
        // }
        this.fetched.contactPoint = contactPoint;
        return contactPoint; // TODO index all contacts
    }

    // TODO
    _getUrlCheckRequestConfig(uri: string): OptionsWithUri {
        let config: OptionsWithUri = {
            method: 'GET',
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
