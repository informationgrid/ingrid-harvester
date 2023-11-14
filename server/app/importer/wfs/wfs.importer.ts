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

import { decode } from 'iconv-lite';
import { defaultWfsSettings, WfsSettings } from './wfs.settings';
import { getLogger } from 'log4js';
import { namespaces } from '../../importer/namespaces';
import { Catalog } from '../../model/dcatApPlu.model';
import { Contact } from '../../model/agent';
import { DOMParser as DomParser } from '@xmldom/xmldom';
import { Entity } from '../../model/entity';
import { GeoJsonUtils } from '../../utils/geojson.utils';
import { Importer } from '../importer';
import { ImportLogMessage, ImportResult } from '../../model/import.result';
import { MiscUtils } from '../../utils/misc.utils';
import { Observer } from 'rxjs';
import { ProfileFactory } from '../../profiles/profile.factory';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader';
import { RequestOptions } from '../../utils/http-request.utils';
import { Response } from 'node-fetch';
import { WfsMapper } from './wfs.mapper';
import { WfsParameters, RequestDelegate } from '../../utils/http-request.utils';
import { XPathNodeSelect, XPathUtils } from '../../utils/xpath.utils';

const fs = require('fs');
const xpath = require('xpath');

const log = getLogger(__filename),
    logRequest = getLogger('requests');

export abstract class WfsImporter extends Importer {

    protected domParser: DomParser;
    private profile: ProfileFactory<WfsMapper>;
    private readonly settings: WfsSettings;
    private readonly requestDelegate: RequestDelegate;

    private totalFeatures = 0;
    private numIndexDocs = 0;

    private generalInfo: object = {};
    private nsMap: {};
    private crsList: string[][];
    private defaultCrs: string;

    protected supportsPaging: boolean = false;

    constructor(settings, requestDelegate?: RequestDelegate) {
        super(settings);

        this.profile = ProfileFactoryLoader.get();

        // merge default settings with configured ones
        settings = MiscUtils.merge(defaultWfsSettings, settings);

        if (requestDelegate) {
            this.requestDelegate = requestDelegate;
        } else {
            let requestConfig = WfsImporter.createRequestConfig(settings);
            this.requestDelegate = new RequestDelegate(requestConfig, WfsImporter.createPaging(settings));
        }
        this.settings = settings;
        this.domParser = new DomParser({
            errorHandler: (level, msg) => {
                // throw on error, swallow rest
                if (level == 'error') {
                    throw new Error(msg);
                }
            }
        });
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
                // await this.elastic.prepareIndex(this.profile.getIndexMappings(), this.profile.getIndexSettings());
                await this.database.beginTransaction();
                await this.harvest();
                if(this.numIndexDocs > 0) {
                    if (this.summary.databaseErrors.length == 0) {
                        await this.database.commitTransaction();
                        await this.database.pushToElastic3ReturnOfTheJedi(this.elastic, this.settings.getFeaturesUrl);
                    }
                    else {
                        await this.database.rollbackTransaction();
                    }
                    // await this.elastic.finishIndex();
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
                    // this.elastic.deleteIndex(this.elastic.indexName);
                }
            } catch (err) {
                this.summary.appErrors.push(err.message ? err.message : err);
                log.error('Error during WFS import', err);
                observer.next(ImportResult.complete(this.summary, 'Error happened'));
                observer.complete();

                // clean up index
                // this.elastic.deleteIndex(this.elastic.indexName);
            }
        }
    }

    async harvest() {
        let capabilitiesRequestConfig = WfsImporter.createRequestConfig({ ...this.settings, resolveWithFullResponse: true }, 'GetCapabilities');
        let capabilitiesRequestDelegate = new RequestDelegate(capabilitiesRequestConfig);
        let capabilitiesResponse: Response = await capabilitiesRequestDelegate.doRequest();
        let contentType = capabilitiesResponse.headers.get('content-type')?.split(';');
        let charset = contentType?.find(ct => ct.toLowerCase().startsWith('charset'))?.split('=')?.[1];
        let responseBody: Buffer | string = await capabilitiesResponse.buffer();
        if (!charset || charset.toLowerCase() == "utf-8") {
            responseBody = responseBody.toString();
        }
        else {
            responseBody = decode(responseBody, charset);
        }
        let capabilitiesResponseDom = this.domParser.parseFromString(responseBody);

        // extract the namespace map for the capabilities
        this.nsMap = MiscUtils.merge(XPathUtils.getNsMap(capabilitiesResponseDom), XPathUtils.getExtendedNsMap(capabilitiesResponseDom));
        let select: XPathNodeSelect = xpath.useNamespaces(this.nsMap);

        // fail early
        if (!select('/*[local-name()="WFS_Capabilities"]', capabilitiesResponseDom, true)) {
            throw new Error(`Could not retrieve WFS_Capabilities from ${capabilitiesRequestDelegate.getFullURL()}: ${responseBody}`);
        }

        // get used CRSs through getCapabilities
        let featureTypes = select('/*[local-name()="WFS_Capabilities"]/*[local-name()="FeatureTypeList"]/*[local-name()="FeatureType"]', capabilitiesResponseDom);
        // import proj4 strings for all EPSGs
        const crs_data = fs.readFileSync('app/importer/proj4.json', { encoding: 'utf8', flag: 'r' });
        let proj4Json = JSON.parse(crs_data);
        // save only those that we need
        this.crsList = [];
        for (let featureType of featureTypes) {
            let typename = select('./*[local-name()="Name"]', featureType, true).textContent;
            if (!this.settings.typename.split(',').includes(typename)) {
                continue;
            }
            let crsNodes = select('./*[local-name()="DefaultCRS" or local-name()="OtherCRS" or local-name()="DefaultSRS" or local-name()="OtherSRS"]', featureType);
            for (let node of crsNodes) {
                let crsCode = node.textContent.replace('urn:ogc:def:crs:EPSG::', '').replace('EPSG:', '');
                this.crsList.push([node.textContent, proj4Json[crsCode]]);
                if ((<Element>node).localName === 'DefaultCRS' || (<Element>node).localName === 'DefaultSRS') {
                    this.defaultCrs = node.textContent;
                }
            }
        }
        this.generalInfo['defaultCrs'] = this.defaultCrs;

        // Regionalschlüssel
        const rs_data = fs.readFileSync('app/importer/regionalschluessel.json', { encoding: 'utf8', flag: 'r' });
        this.generalInfo['regionalschluessel'] = JSON.parse(rs_data);

        let serviceProvider = select('/*[local-name()="WFS_Capabilities"]/ows:ServiceProvider', capabilitiesResponseDom, true);
        // TODO for FIS, there is additional metadata info in a linked CSW
        // TODO do we grab this as well? if yes:
        // - select the CSW link
        // - retrieve the XML from the CSW link
        // - select the appropriate nodes (gmd:contact or gmd:pointOfContact)
        let contact: Contact = {
            // TODO create appropriate contact
            fn: ''
        //     fn: select('./ows:ServiceContact/ows:IndividualName', serviceProvider, true)?.textContent,
        //     hasCountryName: select('./ows:ServiceContact/ows:ContactInfo/ows:Address/ows:Country', serviceProvider, true)?.textContent,
        //     hasLocality: select('./ows:ServiceContact/ows:ContactInfo/ows:Address/ows:City', serviceProvider, true)?.textContent,
        //     hasPostalCode: select('./ows:ServiceContact/ows:ContactInfo/ows:Address/ows:PostalCode', serviceProvider, true)?.textContent,
        //     hasRegion: select('./ows:ServiceContact/ows:ContactInfo/ows:Address/ows:AdministrativeArea', serviceProvider, true)?.textContent,
        //     hasStreetAddress: select('./ows:ServiceContact/ows:ContactInfo/ows:Address/ows:DeliveryPoint', serviceProvider, true)?.textContent,
        //     hasEmail: select('./ows:ServiceContact/ows:ContactInfo/ows:Address/ows:ElectronicMailAddress', serviceProvider, true)?.textContent,
        //     hasOrganizationName: this.generalInfo['publisher']?.[0]?.name,
        //     hasTelephone: select('./ows:ServiceContact/ows:ContactInfo/ows:Phone/ows:Voice', serviceProvider, true)?.textContent,
        //     // hasURL: this.select('./ows:ServiceContact/ows:ContactInfo/ows:OnlineResource/@xlink:href', serviceProvider, true)?.textContent
        };
        Object.keys(contact).filter(k => contact[k] == null).forEach(k => delete contact[k]);
        this.generalInfo['contactPoint'] = contact;

        // retrieve catalog info from database
        let catalog: Catalog = await this.database.getCatalog(this.settings.catalogId) ?? this.database.defaultCatalog;
        this.generalInfo['catalog'] = catalog;

        let hitsRequestConfig = WfsImporter.createRequestConfig({ ...this.settings, maxRecords: undefined, resultType: 'hits' });
        let hitsRequestDelegate = new RequestDelegate(hitsRequestConfig);
        let hitsResponse = await hitsRequestDelegate.doRequest();
        let hitsResponseDom = this.domParser.parseFromString(hitsResponse);
        let hitsResultsNode = hitsResponseDom.getElementsByTagNameNS(this.nsMap['wfs'], 'FeatureCollection')[0];
        this.totalFeatures = parseInt(hitsResultsNode.getAttribute(this.settings.version === '2.0.0' ? 'numberMatched' : 'numberOfFeatures'));
        log.info(`Found ${this.totalFeatures} features at ${this.settings.getFeaturesUrl}`);

        while (true) {
            log.info('Requesting next features');
            let response = await this.requestDelegate.doRequest();
            let harvestTime = new Date(Date.now());

            let responseDom = this.domParser.parseFromString(response);
            let resultsNode = responseDom.getElementsByTagNameNS(this.nsMap['wfs'], 'FeatureCollection')[0];

            if (resultsNode) {
                await this.extractFeatures(response, harvestTime)
            } else {
                const message = `Error while fetching WFS Features. Will continue to try and fetch next records, if any.\nServer response: ${MiscUtils.truncateErrorMessage(responseDom.toString())}.`;
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
        log.info(`Finished requests`);
        await this.database.sendBulkData();
    }

    async extractFeatures(getFeatureResponse, harvestTime) {
        let promises = [];
        let xml = this.domParser.parseFromString(getFeatureResponse, 'application/xml');

        // extend nsmap with the namespaces from the FeatureCollection response
        // this.nsMap = { ...XPathUtils.getNsMap(xml), ...XPathUtils.getExtendedNsMap(xml) };
        // TODO: the above does not work, because it doesn't contain the NS for the FeatureType;
        let nsMap = MiscUtils.merge(this.nsMap, XPathUtils.getNsMap(xml));
        let select: XPathNodeSelect = xpath.useNamespaces(nsMap);

        // store xpath handling stuff in general info
        this.generalInfo['nsMap'] = nsMap;
        this.generalInfo['select'] = select;

        // bounding box if given
        let geojsonUtils = new GeoJsonUtils(nsMap, this.crsList, this.defaultCrs);
        let envelope = select('/wfs:FeatureCollection/gml:boundedBy/gml:Envelope', xml, true);
        if (envelope) {
            let lowerCorner = select('./gml:lowerCorner', envelope, true)?.textContent;
            let upperCorner = select('./gml:upperCorner', envelope, true)?.textContent;
            let crs = (<Element>envelope).getAttribute('srsName');            
            this.generalInfo['boundingBox'] = geojsonUtils.getBoundingBox(lowerCorner, upperCorner, crs);
        }

        // some documents may use wfs:member, some gml:featureMember, some maybe something else: use settings
        let features = select(`/wfs:FeatureCollection/${this.settings.memberElement}`, xml);
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

            let mapper = this.getMapper(this.settings, features[i], harvestTime, this.summary, this.generalInfo, geojsonUtils);

            let doc: any = await this.profile.getIndexDocument().create(mapper).catch(e => {
                log.error('Error creating index document', e);
                this.summary.appErrors.push(e.toString());
                mapper.skipped = true;
            });

            if (!this.settings.dryRun && !mapper.shouldBeSkipped()) {
                let entity: Entity = {
                    identifier: uuid,
                    source: this.settings.getFeaturesUrl,
                    collection_id: this.generalInfo['catalog'].id,
                    dataset: doc,
                    original_document: mapper.getHarvestedData()
                };
                promises.push(this.database.addEntityToBulk(entity));
            } else {
                this.summary.skippedDocs.push(uuid);
            }
            this.observer.next(ImportResult.running(++this.numIndexDocs, this.totalFeatures));
        }
        await Promise.all(promises).catch(err => log.error('Error indexing WFS record', err));
    }

    abstract getMapper(settings, feature, harvestTime, summary, generalInfo, geojsonUtils): WfsMapper;

    static createRequestConfig(settings: WfsSettings, request = 'GetFeature'): RequestOptions {
        let requestConfig: RequestOptions = {
            method: settings.httpMethod || "GET",
            uri: settings.getFeaturesUrl,
            json: false,
            headers: RequestDelegate.wfsRequestHeaders(),
            proxy: settings.proxy || null,
            resolveWithFullResponse: settings.resolveWithFullResponse ?? false,
            timeout: settings.timeout
        };

        // TODO
        // * correct namespaces
        // * check filter
        // * support paging if server supports it
        if (settings.httpMethod === "POST") {
            if (request === 'GetFeature') {
                requestConfig.body = `<?xml version="1.0" encoding="UTF-8"?>
                <GetFeatures xmlns="${namespaces.CSW}"
                        xmlns:gmd="${namespaces.GMD}"
                        xmlns:xsi="${namespaces.XSI}"
                        xmlns:ogc="${namespaces.OGC}"
                        xsi:schemaLocation="${namespaces.CSW}"
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
            if (settings.maxRecords) {
                requestConfig.qs.startIndex = settings.startPosition;
                requestConfig.qs.maxFeatures = settings.maxRecords;
            }
        }

        return requestConfig;
    }

    static createPaging(settings: WfsSettings) {
        return {
            startFieldName: 'startIndex',
            startPosition: settings.startPosition,
            numRecords: settings.maxRecords,
            count: settings.maxRecords
        }
    }
}
