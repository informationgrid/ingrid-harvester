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

import * as fs from 'fs';
import * as xpath from 'xpath';
import * as GeoJsonUtils from '../../utils/geojson.utils';
import * as MiscUtils from '../../utils/misc.utils';
import { decode } from 'iconv-lite';
import { defaultWfsSettings, WfsSettings } from './wfs.settings';
import { firstElementChild, getExtendedNsMap, getNsMap, XPathNodeSelect } from '../../utils/xpath.utils';
import { getLogger } from 'log4js';
import { getProxyConfig } from '../../utils/service.utils';
import { namespaces } from '../../importer/namespaces';
import { Catalog } from '../../model/dcatApPlu.model';
import { Contact, Organization, Person } from '../../model/agent';
import { CswMapper } from '../../importer/csw/csw.mapper';
import { DOMParser } from '@xmldom/xmldom';
import { Importer } from '../importer';
import { ImportLogMessage, ImportResult } from '../../model/import.result';
import { Observer } from 'rxjs';
import { ProfileFactory } from '../../profiles/profile.factory';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader';
import { RecordEntity } from '../../model/entity';
import { RequestOptions } from '../../utils/http-request.utils';
import { Response } from 'node-fetch';
import { WfsMapper } from './wfs.mapper';
import { WfsParameters, RequestDelegate } from '../../utils/http-request.utils';

const log = getLogger(__filename);
const logRequest = getLogger('requests');

export abstract class WfsImporter extends Importer {

    protected domParser: DOMParser;
    protected profile: ProfileFactory<WfsMapper>;
    protected requestDelegate: RequestDelegate;
    declare protected settings: WfsSettings;

    private totalFeatures = 0;
    private numIndexDocs = 0;

    private generalInfo: object = {};
    private nsMap: {};

    protected supportsPaging: boolean = false;

    constructor(settings, requestDelegate?: RequestDelegate) {
        super(settings);

        this.profile = ProfileFactoryLoader.get();
        this.domParser = MiscUtils.getDomParser();

        // merge default settings with configured ones
        settings = MiscUtils.merge(defaultWfsSettings, settings);

        if (requestDelegate) {
            this.requestDelegate = requestDelegate;
        } else {
            let requestConfig = WfsImporter.createRequestConfig(settings);
            this.requestDelegate = new RequestDelegate(requestConfig, WfsImporter.createPaging(settings));
        }
        this.settings = settings;
    }

    // only here for documentation - use the "default" exec function
    async exec(observer: Observer<ImportLogMessage>): Promise<void> {
        await super.exec(observer);
    }

    protected async harvest(): Promise<number> {
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
        this.nsMap = MiscUtils.merge(getNsMap(capabilitiesResponseDom), getExtendedNsMap(capabilitiesResponseDom));
        let select = <XPathNodeSelect>xpath.useNamespaces(this.nsMap);

        // fail early
        if (!select('/*[local-name()="WFS_Capabilities"]', capabilitiesResponseDom, true)) {
            throw new Error(`Could not retrieve WFS_Capabilities from ${capabilitiesRequestDelegate.getFullURL()}: ${responseBody}`);
        }

        // default CRS
        let featureTypes = select('/*[local-name()="WFS_Capabilities"]/*[local-name()="FeatureTypeList"]/*[local-name()="FeatureType"]', capabilitiesResponseDom);
        for (let featureType of featureTypes) {
            let typename = select('./*[local-name()="Name"]', featureType, true).textContent;
            if (!this.settings.typename.split(',').includes(typename)) {
                continue;
            }
            let defaultCrs = select('./*[local-name()="DefaultCRS" or local-name()="DefaultSRS"]', featureType, true)?.textContent;
            this.generalInfo['defaultCrs'] = defaultCrs.replace('urn:ogc:def:crs:EPSG::', '').replace('EPSG:', '');
            break;
        }

        // Regionalschlüssel
        const rs_data = fs.readFileSync('app/importer/regionalschluessel.json', { encoding: 'utf8', flag: 'r' });
        this.generalInfo['regionalschluessel'] = JSON.parse(rs_data);

        // general metadata contacts
        // role -> contact
        let contacts: Map<string, Contact> = new Map();
        if (this.settings.contactCswUrl) {
            let response = await RequestDelegate.doRequest({
                uri: this.settings.contactCswUrl,
                accept: 'text/xml',
                ...getProxyConfig()
            });
            let responseDom = this.domParser.parseFromString(response);
            let metadata = CswMapper.select('./csw:GetRecordByIdResponse/gmd:MD_Metadata', responseDom, true);
            let xpaths = [
                // for now, only use gmd:contact as pointOfContact (the sparsely populated entry of the two listed below)
                './gmd:contact/gmd:CI_ResponsibleParty[gmd:role/gmd:CI_RoleCode/@codeListValue="pointOfContact"]',
                // './gmd:identificationInfo/gmd:MD_DataIdentification/gmd:pointOfContact/gmd:CI_ResponsibleParty[gmd:role/gmd:CI_RoleCode/@codeListValue="pointOfContact"]',
                './gmd:identificationInfo/gmd:MD_DataIdentification/gmd:pointOfContact/gmd:CI_ResponsibleParty[gmd:role/gmd:CI_RoleCode/@codeListValue="custodian"]'
            ];
            for (let xpath of xpaths) {
                let pointOfContact = CswMapper.select(xpath, metadata, true);
                let role = CswMapper.select('./gmd:role/gmd:CI_RoleCode', pointOfContact, true).getAttribute('codeListValue');
                let contactInfo = CswMapper.select('./gmd:contactInfo/gmd:CI_Contact', pointOfContact, true);
                let address = CswMapper.select('./gmd:address/gmd:CI_Address', contactInfo, true);
                let contact = {
                    fn: CswMapper.getCharacterStringContent(pointOfContact, 'individualName'),
                    hasCountryName: CswMapper.getCharacterStringContent(address, 'country'),
                    hasLocality: CswMapper.getCharacterStringContent(address, 'city'),
                    hasPostalCode: CswMapper.getCharacterStringContent(address, 'postalCode'),
                    hasRegion: CswMapper.getCharacterStringContent(address, 'administrativeArea'),
                    hasStreetAddress: CswMapper.getCharacterStringContent(contactInfo, 'deliveryPoint'),
                    hasEmail: CswMapper.getCharacterStringContent(address, 'electronicMailAddress'),
                    hasOrganizationName: CswMapper.getCharacterStringContent(pointOfContact, 'organisationName'),
                    hasTelephone: CswMapper.getCharacterStringContent(contactInfo, 'phone/gmd:CI_Telephone/gmd:voice'),
                    hasURL: CswMapper.getCharacterStringContent(contactInfo, 'onlineResource/gmd:CI_OnlineResource/gmd:linkage/gmd:URL')
                };
                Object.keys(contact).filter(k => contact[k] == null).forEach(k => delete contact[k]);
                if (!contact.fn?.trim()) {
                    contact.fn = contact.hasOrganizationName;
                }
                contacts.set(role, contact);
            }
        }

        // general contact
        let pointOfContact: Contact = contacts.get('pointOfContact');
        // fallbacks
        if (!pointOfContact?.fn?.trim()) {
            if (this.settings.contactMetadata) {
                pointOfContact = this.settings.contactMetadata;
            }
            else {
                pointOfContact = {
                    fn: ''
                };
            }
        }
        this.generalInfo['contactPoint'] = pointOfContact;

        // general maintainer
        let maintainer: Person | Organization = { organization: contacts.get('custodian')?.hasOrganizationName };
        // fallbacks
        if (!maintainer.organization?.trim()) {
            if (contacts.get('custodian')?.fn?.trim()) {
                maintainer = { name: contacts.get('custodian')?.fn };
            }
            else if (pointOfContact.hasOrganizationName?.trim()) {
                maintainer = { organization: pointOfContact.hasOrganizationName };
            }
            else if (pointOfContact.fn?.trim()) {
                maintainer = { name: pointOfContact.fn };
            }
            else if (this.settings.maintainer?.['name'] || this.settings.maintainer?.['organization']) {
                maintainer = this.settings.maintainer;
            }
            else {
                maintainer = {
                    name: '',
                    type: ''
                };
            }
        }
        this.generalInfo['maintainer'] = maintainer;

        // retrieve catalog info from database
        let catalog: Catalog = await this.database.getCatalog(this.settings.catalogId);
        this.generalInfo['catalog'] = catalog;

        let hitsRequestConfig = WfsImporter.createRequestConfig({ ...this.settings, maxRecords: undefined, resultType: 'hits' });
        let hitsRequestDelegate = new RequestDelegate(hitsRequestConfig);
        let hitsResponse = await hitsRequestDelegate.doRequest();
        let hitsResponseDom = this.domParser.parseFromString(hitsResponse);
        let hitsResultsNode = hitsResponseDom.getElementsByTagNameNS(this.nsMap['wfs'], 'FeatureCollection')[0];
        this.totalFeatures = parseInt(hitsResultsNode.getAttribute(this.settings.version === '2.0.0' ? 'numberMatched' : 'numberOfFeatures'));
        log.info(`Found ${this.totalFeatures} features at ${this.settings.sourceURL}`);

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

        return this.numIndexDocs;
    }

    async extractFeatures(getFeatureResponse, harvestTime) {
        let promises = [];
        let xml = this.domParser.parseFromString(getFeatureResponse, 'application/xml');

        // extend nsmap with the namespaces from the FeatureCollection response
        // this.nsMap = { ...XPathUtils.getNsMap(xml), ...XPathUtils.getExtendedNsMap(xml) };
        // TODO: the above does not work, because it doesn't contain the NS for the FeatureType;
        let nsMap = MiscUtils.merge(this.nsMap, getNsMap(xml));
        let select = <XPathNodeSelect>xpath.useNamespaces(nsMap);

        // store xpath handling stuff in general info
        this.generalInfo['nsMap'] = nsMap;
        this.generalInfo['select'] = select;

        // bounding box if given
        let envelope = select('/wfs:FeatureCollection/gml:boundedBy/gml:Envelope', xml, true);
        if (envelope) {
            let lowerCorner = select('./gml:lowerCorner', envelope, true)?.textContent;
            let upperCorner = select('./gml:upperCorner', envelope, true)?.textContent;
            let crs = (<Element>envelope).getAttribute('srsName') || this.generalInfo['defaultCrs'];
            this.generalInfo['boundingBox'] = GeoJsonUtils.getBoundingBox(lowerCorner, upperCorner, crs);
        }

        // some documents may use wfs:member, some gml:featureMember, some maybe something else: use settings
        let features = select(`/wfs:FeatureCollection/${this.settings.memberElement}`, xml);
        for (let i = 0; i < features.length; i++) {
            this.summary.numDocs++;

            const uuid = firstElementChild(features[i]).getAttributeNS(nsMap['gml'], 'id');
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

            let mapper = this.getMapper(this.settings, features[i], harvestTime, this.summary, this.generalInfo);

            let doc: any = await this.profile.getIndexDocumentFactory(mapper).create().catch(e => {
                log.error('Error creating index document', e);
                this.summary.appErrors.push(e.toString());
                mapper.skipped = true;
            });

            if (!this.settings.dryRun && !mapper.shouldBeSkipped()) {
                let entity: RecordEntity = {
                    identifier: uuid,
                    source: this.settings.sourceURL,
                    collection_id: (await this.database.getCatalog(this.settings.catalogId)).id,
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

    abstract getMapper(settings, feature, harvestTime, summary, generalInfo): WfsMapper;

    static createRequestConfig(settings: WfsSettings, request = 'GetFeature'): RequestOptions {
        let requestConfig: RequestOptions = {
            method: settings.httpMethod || "GET",
            uri: settings.sourceURL,
            json: false,
            headers: RequestDelegate.wfsRequestHeaders(),
            proxy: settings.proxy || null,
            rejectUnauthorized: settings.rejectUnauthorizedSSL,
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
