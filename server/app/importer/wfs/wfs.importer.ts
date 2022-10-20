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

import { decode } from 'iconv-lite';
import {DefaultElasticsearchSettings, ElasticSearchUtils} from '../../utils/elastic.utils';
import {elasticsearchMapping} from '../../elastic.mapping';
import {elasticsearchSettings} from '../../elastic.settings';
import {IndexDocument} from '../../model/index.document';
import {WfsMapper} from './wfs.mapper';
import {Summary} from '../../model/summary';
import {getLogger} from 'log4js';
import {WfsParameters, RequestDelegate} from '../../utils/http-request.utils';
import {OptionsWithUri} from 'request-promise';
import {DefaultImporterSettings, Importer} from '../../importer';
import {Observable, Observer} from 'rxjs';
import {ImportLogMessage, ImportResult} from '../../model/import.result';
import {DefaultXpathSettings, WfsSettings} from './wfs.settings';
import {FilterUtils} from "../../utils/filter.utils";
import { Contact } from "../../model/generic.mapper";
import { GeoJsonUtils } from "../../utils/geojson.utils";
import { MiscUtils } from '../../utils/misc.utils';
import { XPathUtils } from '../../utils/xpath.utils';

const fs = require('fs');
const xpath = require('xpath');

let log = require('log4js').getLogger(__filename),
    logSummary = getLogger('summary'),
    logRequest = getLogger('requests'),
    DomParser = require('xmldom').DOMParser;

export class WfsSummary extends Summary {
    additionalSummary() {
        logSummary.info(`Number of records with at least one mandatory keyword: ${this.opendata}`);
        logSummary.info(`Number of records with missing links: ${this.missingLinks}`);
        logSummary.info(`Number of records with missing license: ${this.missingLicense}`);
        logSummary.info(`Number of records with missing publishers: ${this.missingPublishers}`);
        logSummary.info(`Number of records imported as valid: ${this.ok}`);
    }
}

// export const DefaultXplanSettings: any = {
//     xpaths: {
//         featureParent: './wfs:FeatureCollection/wfs:member',
//         name: './*/xplan:name',
//         description: './*/xplan:beschreibung',
//         spatial: './*/xplan:raeumlicherGeltungsbereich',
//         capabilities: {
//             abstract: './ows:ServiceIdentification/ows:Abstract',
//             language: './ows:OperationsMetadata/ows:ExtendedCapabilities/inspire_dls:ExtendedCapabilities/inspire_common:ResponseLanguage/inspire_common:Language',
//             serviceProvider: './*[local-name="WFS_Capabilities"]/ows:ServiceProvider',
//             title: './ows:ServiceIdentification/ows:Title'
//         }
//     }
// };

// export const DefaultFisSettings: any = {
//     xpaths: {
//         featureParent: './wfs:FeatureCollection/gml:featureMember',
//         name: './*/fis:PLANNAME',
//         description: './*/fis:BEREICH',
//         spatial: './*/fis:SHAPE_25833',
//         capabilities: {
//             abstract: './ows:ServiceIdentification/ows:Abstract',
//             language: '',
//             serviceProvider: './*[local-name="WFS_Capabilities"]/ows:ServiceProvider',
//             title: './ows:ServiceIdentification/ows:Title'
//         }
//     }
// }

export class WfsImporter implements Importer {
    private readonly settings: WfsSettings;
    elastic: ElasticSearchUtils;
    private readonly requestDelegate: RequestDelegate;

    private totalFeatures = 0;
    private numIndexDocs = 0;

    static defaultSettings: Partial<WfsSettings> = {
        ...DefaultElasticsearchSettings,
        ...DefaultImporterSettings,
        ...DefaultXpathSettings,
        // getFeaturesUrl: '',
        eitherKeywords: [],
        httpMethod: 'GET',
        resultType: 'results'
    };

    private readonly summary: WfsSummary;
    private filterUtils: FilterUtils;
    private generalInfo: object = {};
    private supportsPaging: boolean = false;
    private select: Function;
    private nsMap: {};
    private crsList: string[][];
    private defaultCrs: string;

    run = new Observable<ImportLogMessage>(observer => {
        this.observer = observer;
        this.exec(observer);
    });

    private observer: Observer<ImportLogMessage>;

    constructor(settings, requestDelegate?: RequestDelegate) {
        // merge default settings with configured ones
        settings = MiscUtils.merge(WfsImporter.defaultSettings, settings);

        // TODO disallow setting "//" in xpaths in the UI

        if (requestDelegate) {
            this.requestDelegate = requestDelegate;
        } else {
            let requestConfig = WfsImporter.createRequestConfig(settings);
            this.requestDelegate = new RequestDelegate(requestConfig, WfsImporter.createPaging(settings));
        }

        this.settings = settings;
        this.filterUtils = new FilterUtils(settings);

        this.summary = new WfsSummary(settings);

        this.elastic = new ElasticSearchUtils(settings, this.summary);
    }

    async exec(observer: Observer<ImportLogMessage>): Promise<void> {
        if (this.settings.dryRun) {
            log.debug('Dry run option enabled. Skipping index creation.');
            await this.harvest();
            log.debug('Skipping finalisation of index for dry run.');
            observer.next(ImportResult.complete(this.summary, 'Dry run ... no indexing of data'));
            observer.complete();
        } else {
            try {
                await this.elastic.prepareIndex(elasticsearchMapping, elasticsearchSettings);
                await this.harvest();
                if(this.numIndexDocs > 0) {
                    await this.elastic.sendBulkData(false);
                    await this.elastic.finishIndex();
                    observer.next(ImportResult.complete(this.summary));
                    observer.complete();
                } else {
                    if(this.summary.appErrors.length === 0) {
                        this.summary.appErrors.push('No Results');
                    }
                    log.warn('No results during WFS import - Keep old index');
                    observer.next(ImportResult.complete(this.summary, 'No Results - Keep old index'));
                    observer.complete();

                    // clean up index
                    this.elastic.deleteIndex(this.elastic.indexName);
                }
            } catch (err) {
                this.summary.appErrors.push(err.message ? err.message : err);
                log.error('Error during WFS import', err);
                observer.next(ImportResult.complete(this.summary, 'Error happened'));
                observer.complete();

                // clean up index
                this.elastic.deleteIndex(this.elastic.indexName);
            }
        }
    }

    async harvest() {

        let capabilitiesRequestConfig = WfsImporter.createRequestConfig({ ...this.settings, resolveWithFullResponse: true, encoding: null }, 'GetCapabilities');
        let capabilitiesRequestDelegate = new RequestDelegate(capabilitiesRequestConfig);
        let capabilitiesResponse = await capabilitiesRequestDelegate.doRequest();
        let contentType = capabilitiesResponse.headers['content-type'].split(';');
        let charset = contentType.find(ct => ct.toLowerCase().startsWith('charset'))?.split('=')?.[1];
        let responseBody = capabilitiesResponse.body;
        if (charset.toLowerCase() == "utf-8") {
            responseBody = responseBody.toString();
        }
        else {
            responseBody = decode(responseBody, charset);
        }
        let capabilitiesResponseDom = new DomParser().parseFromString(responseBody);

        // extract the namespace map for the capabilities
        this.nsMap = MiscUtils.merge(XPathUtils.getNsMap(capabilitiesResponseDom), XPathUtils.getExtendedNsMap(capabilitiesResponseDom));
        this.select = xpath.useNamespaces(this.nsMap);

        // get used CRSs through getCapabilities
        let featureTypes = this.select('/*[local-name()="WFS_Capabilities"]/*[local-name()="FeatureTypeList"]/*[local-name()="FeatureType"]', capabilitiesResponseDom, false);
        // import proj4 strings for all EPSGs
        const data = fs.readFileSync('app/importer/proj4.json', { encoding: 'utf8', flag: 'r' });
        let proj4Json = JSON.parse(data);
        // save only those that we need
        this.crsList = [];
        for (let featureType of featureTypes) {
            let typename = this.select('./*[local-name()="Name"]', featureType, true).textContent;
            if (!this.settings.typename.split(',').includes(typename)) {
                continue;
            }
            let crsNodes = this.select('./*[local-name()="DefaultCRS" or local-name()="OtherCRS" or local-name()="DefaultSRS" or local-name()="OtherSRS"]', featureType, false);
            for (let node of crsNodes) {
                this.crsList.push([node.textContent, proj4Json[node.textContent.replace('EPSG:', '')]]);
                if (node.localName === 'DefaultCRS' || node.localName === 'DefaultSRS') {
                    this.defaultCrs = node.textContent;
                }
            }
        }
        this.generalInfo['defaultCrs'] = this.defaultCrs;

        let serviceProvider = this.select(this.settings.xpaths.capabilities.serviceProvider, capabilitiesResponseDom, true);
        // TODO for FIS, there is additional metadata info in a linked CSW
        // TODO do we grab this as well? if yes:
        // - select the CSW link
        // - retrieve the XML from the CSW link
        // - select the appropriate nodes (gmd:contact or gmd:pointOfContact)
        let contact: Contact = {
            fn: this.select('./ows:ServiceContact/ows:IndividualName', serviceProvider, true)?.textContent,
            hasAddress: {
                'country-name': this.select('./ows:ServiceContact/ows:ContactInfo/ows:Address/ows:Country', serviceProvider, true)?.textContent,
                locality: this.select('./ows:ServiceContact/ows:ContactInfo/ows:Address/ows:City', serviceProvider, true)?.textContent,
                'postal-code': this.select('./ows:ServiceContact/ows:ContactInfo/ows:Address/ows:PostalCode', serviceProvider, true)?.textContent,
                region: this.select('./ows:ServiceContact/ows:ContactInfo/ows:Address/ows:AdministrativeArea', serviceProvider, true)?.textContent,
                'street-address': this.select('./ows:ServiceContact/ows:ContactInfo/ows:Address/ows:DeliveryPoint', serviceProvider, true)?.textContent
            },
            hasEmail: this.select('./ows:ServiceContact/ows:ContactInfo/ows:Address/ows:ElectronicMailAddress', serviceProvider, true)?.textContent,
            'organization-name': this.generalInfo['publisher']?.[0]?.name,
            hasTelephone: this.select('./ows:ServiceContact/ows:ContactInfo/ows:Phone/ows:Voice', serviceProvider, true)?.textContent,
            // hasURL: this.select('./ows:ServiceContact/ows:ContactInfo/ows:OnlineResource/@xlink:href', serviceProvider, true)?.textContent
        };
        // remove empty properties
        Object.keys(contact.hasAddress).filter(k => contact.hasAddress[k] == null).forEach(k => delete contact.hasAddress[k]);
        if (Object.keys(contact.hasAddress).length == 0) {
            delete contact.hasAddress;
        }
        Object.keys(contact).filter(k => contact[k] == null).forEach(k => delete contact[k]);
        this.generalInfo['contactPoint'] = contact;

        // store catalog info from getCapabilities in generalInfo
        this.generalInfo['catalog'] = {
            description: this.select(this.settings.xpaths.capabilities.abstract, capabilitiesResponseDom, true)?.textContent,
            homepage: this.settings.getFeaturesUrl,
            language: this.select(this.settings.xpaths.capabilities.language, capabilitiesResponseDom, true)?.textContent ?? this.settings.xpaths.capabilities.language,
            publisher: [{ name: this.select('./ows:ProviderName', serviceProvider, true)?.textContent }],
            title: this.select(this.settings.xpaths.capabilities.title, capabilitiesResponseDom, true)?.textContent
        };

        while (true) {
            log.debug('Requesting next features');
            let response = await this.requestDelegate.doRequest();
            let harvestTime = new Date(Date.now());

            let responseDom = new DomParser().parseFromString(response);
            let resultsNode = responseDom.getElementsByTagNameNS(this.nsMap['wfs'], 'FeatureCollection')[0];

            if (resultsNode) {
                // TODO for v2.0.0, the request will only return accurate numbers if used with a "resultType=hits" query ("unknown" otherwise)
                // TODO so, before a "real" GetFeature request we should send one to determine metadataset size
                // this.totalFeatures = resultsNode.getAttribute(this.settings.version === '2.0.0' ? 'numberMatched' : 'numberOfFeatures');
                let hitsRequestConfig = WfsImporter.createRequestConfig({ ...this.settings, resultType: 'hits' });
                let hitsRequestDelegate = new RequestDelegate(hitsRequestConfig);
                let hitsResponse = await hitsRequestDelegate.doRequest();
                let hitsResponseDom = new DomParser().parseFromString(hitsResponse);
                let hitsResultsNode = hitsResponseDom.getElementsByTagNameNS(this.nsMap['wfs'], 'FeatureCollection')[0];
                this.totalFeatures = parseInt(hitsResultsNode.getAttribute(this.settings.version === '2.0.0' ? 'numberMatched' : 'numberOfFeatures'));

                // TODO for v2.0.0, the request will return 0 (regardless of resultType)
                // TODO for v1.1.0, the request will not return a separate "number returned" attribute
                let numReturned = parseInt(this.settings.version === '2.0.0' ? resultsNode.getAttribute('numberReturned') : '0');
                numReturned = this.totalFeatures;

                log.debug(`Received ${numReturned} records from ${this.settings.getFeaturesUrl}`);
                await this.extractFeatures(response, harvestTime)
            } else {
                const message = `Error while fetching WFS Records. Will continue to try and fetch next records, if any.\nServer response: ${responseDom.toString()}.`;
                log.error(message);
                this.summary.appErrors.push(message);
            }
            this.requestDelegate.incrementStartRecordIndex();
            /*
              * startRecord was already incremented in the last step, so we can
              * directly use it to check if we need to continue.
              *
              * If there is a problem with the first request, then numMatched is
              * still 0. This will result in no records being harvested. If this
              * behaviour is not desired then the following check should be
              * updated. The easiest solution would be to set numMatched to
              * maxRecords * numRetries
              */
            if (!this.supportsPaging || this.totalFeatures < this.requestDelegate.getStartRecordIndex()) {
                break;
            }
        }
        // TODO: how to couple WFS?
        // this.createDataServiceCoupling();
    }

    // ED: TODO
    createDataServiceCoupling(){
        let bulkData = this.elastic._bulkData;
        let servicesByDataIdentifier = [];
        let servicesByFileIdentifier = [];
        for(let i = 0; i < bulkData.length; i++){
            let doc = bulkData[i];
            if(doc.extras){
                let harvestedData = doc.extras.harvested_data;
                let xml = new DomParser().parseFromString(harvestedData, 'application/xml');
                let identifierList = this.select('.//srv:coupledResource/srv:SV_CoupledResource/srv:identifier/gco:CharacterString', xml)
                if(identifierList && identifierList.length > 0){
                    for(let j = 0; j < identifierList.length; j++){
                        let identifer = identifierList[j].textContent;
                        if(!servicesByDataIdentifier[identifer]){
                            servicesByDataIdentifier[identifer] = [];
                        }
                        servicesByDataIdentifier[identifer] = servicesByDataIdentifier[identifer].concat(doc.distribution);
                    }
                } else {
                    identifierList = this.select('.//srv:operatesOn', xml)
                    if (identifierList && identifierList.length > 0) {
                        for (let j = 0; j < identifierList.length; j++) {
                            let identifer = identifierList[j].getAttribute("uuidref")
                            if (!servicesByFileIdentifier[identifer]) {
                                servicesByFileIdentifier[identifer] = [];
                            }
                            servicesByFileIdentifier[identifer] = servicesByFileIdentifier[identifer].concat(doc.distribution);
                        }
                    }
                }
            }
        }

        for(let i = 0; i < bulkData.length; i++){
            let doc = bulkData[i];
            if(doc.extras){
                let harvestedData = doc.extras.harvested_data;
                let xml = new DomParser().parseFromString(harvestedData, 'application/xml');
                let identifierList = this.select('.//gmd:identificationInfo/gmd:MD_DataIdentification/gmd:citation/gmd:CI_Citation/gmd:identifier/gmd:MD_Identifier/gmd:code/gco:CharacterString', xml)
                if(identifierList){
                    for(let j = 0; j < identifierList.length; j++){
                        let identifer = identifierList[j].textContent;
                        if(servicesByDataIdentifier[identifer]){
                            doc.distribution = doc.distribution.concat(servicesByDataIdentifier[identifer]);
                        }
                    }
                }
                identifierList = this.select('.//gmd:fileIdentifier/gco:CharacterString', xml)
                if(identifierList){
                    for(let j = 0; j < identifierList.length; j++){
                        let identifer = identifierList[j].textContent;
                        if(servicesByFileIdentifier[identifer]){
                            doc.distribution = doc.distribution.concat(servicesByFileIdentifier[identifer]);
                        }
                    }
                }
            }
        }
    }

    // ED: TODO
    async extractFeatures(getFeatureResponse, harvestTime) {
        let promises = [];
        let xml = new DomParser().parseFromString(getFeatureResponse, 'application/xml');

        // extend nsmap with the namespaces from the FeatureCollection response
        // this.nsMap = { ...XPathUtils.getNsMap(xml), ...XPathUtils.getExtendedNsMap(xml) };
        // TODO: the above does not work, because it doesn't contain the NS for the FeatureType;
        let nsMap = MiscUtils.merge(this.nsMap, XPathUtils.getNsMap(xml));
        let select = xpath.useNamespaces(nsMap);

        // store xpath handling stuff in general info
        this.generalInfo['nsMap'] = nsMap;
        this.generalInfo['select'] = select;

        let geojsonUtils = new GeoJsonUtils(nsMap, this.crsList, this.defaultCrs);
        // bounding box if given
        let envelope = select('./gml:Envelope/gml:boundedBy', xml, true);
        if (envelope != null) {
            let lowerCorner = select('./gml:lowerCorner/text()', envelope, true);
            let upperCorner = select('./gml:upperCorner/text()', envelope, true);
            let crs = envelope.getAttribute('srsName');            
            this.generalInfo['boundingBox'] = geojsonUtils.getBoundingBox(lowerCorner, upperCorner, crs);
        }

        // some documents may use wfs:member, some gml:featureMember, some maybe something else: use settings
        let features = select(this.settings.xpaths.featureParent, xml, false);
        let ids = [];
        for (let i = 0; i < features.length; i++) {
            ids.push(XPathUtils.firstElementChild(features[i]).getAttributeNS(nsMap['gml'], 'id'));
        }

        let now = new Date(Date.now());
        let storedData;

        if (this.settings.dryRun) {
            storedData = ids.map(() => now);
        } else {
            storedData = await this.elastic.getStoredData(ids);
        }

        for (let i = 0; i < features.length; i++) {
            this.summary.numDocs++;

            const uuid = XPathUtils.firstElementChild(features[i]).getAttributeNS(nsMap['gml'], 'id');
            if (!this.filterUtils.isIdAllowed(uuid)) {
                this.summary.skippedDocs.push(uuid);
                continue;
            }

            if (log.isDebugEnabled()) {
                log.debug(`Import document ${i + 1} from ${features.length}`);
            }
            if (logRequest.isDebugEnabled()) {
                logRequest.debug("Record content: ", features[i].toString());
            }

            let mapper = this.getMapper(this.settings, features[i], harvestTime, storedData[i], this.summary, this.generalInfo, geojsonUtils);

            let doc: any = await IndexDocument.create(mapper).catch(e => {
                log.error('Error creating index document', e);
                this.summary.appErrors.push(e.toString());
                mapper.skipped = true;
            });

            if (!mapper.shouldBeSkipped()) {

                if (doc.extras.metadata.isValid && doc.distribution.length > 0) {
                    this.summary.ok++;
                }

                if (!this.settings.dryRun) {
                    promises.push(
                        this.elastic.addDocToBulk(doc, uuid)
                            .then(response => {
                                if (!response.queued) {
                                    // numIndexDocs += ElasticSearchUtils.maxBulkSize;
                                    // this.observer.next(ImportResult.running(numIndexDocs, records.length));
                                }
                            })
                    );
                }

            } else {
                this.summary.skippedDocs.push(uuid);
            }
            this.observer.next(ImportResult.running(++this.numIndexDocs, this.totalFeatures));
        }
        await Promise.all(promises)
            .catch(err => log.error('Error indexing WFS record', err));
    }

    getMapper(settings, feature, harvestTime, storedData, summary, generalInfo, geojsonUtils): WfsMapper {
        return new WfsMapper(settings, feature, harvestTime, storedData, summary, generalInfo, geojsonUtils);
    }

    static createRequestConfig(settings: WfsSettings, request = 'GetFeature'): OptionsWithUri {
        let requestConfig: OptionsWithUri = {
            method: settings.httpMethod || "GET",
            uri: settings.getFeaturesUrl,
            json: false,
            headers: RequestDelegate.wfsRequestHeaders(),
            proxy: settings.proxy || null,
            resolveWithFullResponse: settings.resolveWithFullResponse ?? false
        };
        if (settings.hasOwnProperty('encoding')) {
            requestConfig.encoding = settings.encoding;
        }

        // TODO
        // * correct namespaces
        // * check filter
        // * support paging if server supports it
        if (settings.httpMethod === "POST") {
            if (request === 'GetFeature') {
                requestConfig.body = `<?xml version="1.0" encoding="UTF-8"?>
                <GetFeatures xmlns="http://www.opengis.net/cat/csw/2.0.2"
                            xmlns:gmd="http://www.isotc211.org/2005/gmd"
                            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                            xmlns:ogc="http://www.opengis.net/ogc"
                            xsi:schemaLocation="http://www.opengis.net/cat/csw/2.0.2"
                            service="WFS"
                            version="${settings.version}"
                            resultType="${settings.resultType}"
                    <DistributedSearch/>
                    <Query typename="${settings.typename}">
                        ${settings.featureFilter ? `
                        <Constraint version=\"1.1.0\">
                            ${settings.featureFilter}
                        </Constraint>` : ''}
                    </Query>
                </GetFeatures>`;
            }
            else {
                // TODO send GetCapabilities post request
            }
        } else {
            requestConfig.qs = <WfsParameters>{
                request: request,
                SERVICE: 'WFS',
                VERSION: settings.version,
                resultType: settings.resultType,
                typename: settings.typename,
                CONSTRAINTLANGUAGE: 'FILTER',
                CONSTRAINT_LANGUAGE_VERSION: '1.1.0'
            };
            if (settings.featureFilter) {
                requestConfig.qs.constraint = settings.featureFilter;
            }
        }

        return requestConfig;
    }

    // TODO implement paging
    // low priority, as neither hamburg nor freiburg implement paging on the server side
    static createPaging(settings: WfsSettings) {
        return {
            // TODO paging in WFS works not by selecting a start index, but by traversing "next" URLs given in the server response
            startFieldName: 'startPosition',
            startPosition: settings.startPosition,
            numRecords: settings.maxRecords,
            count: settings.maxRecords
        }
    }

    getSummary(): Summary {
        return this.summary;
    }
}
