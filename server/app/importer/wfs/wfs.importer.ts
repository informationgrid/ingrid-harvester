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

import * as xpath from 'xpath';
import * as GeoJsonUtils from '../../utils/geojson.utils';
import * as MiscUtils from '../../utils/misc.utils';
import { decode } from 'iconv-lite';
import { defaultWfsSettings, WfsSettings } from './wfs.settings';
import { firstElementChild, getExtendedNsMap, getNsMap, XPathNodeSelect } from '../../utils/xpath.utils';
import { getLogger } from 'log4js';
import { namespaces } from '../../importer/namespaces';
import { Catalog } from '../../model/dcatApPlu.model';
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

export class WfsImporter extends Importer {

    protected domParser: DOMParser;
    protected profile: ProfileFactory<WfsMapper>;
    protected settings: WfsSettings;

    private numItems = 0;
    private numIndexDocs = 0;

    private generalInfo: object = {};
    protected nsMap: {};

    protected supportsPaging: boolean = false;

    constructor(settings: WfsSettings) {
        super(settings);
        this.profile = ProfileFactoryLoader.get();
        this.domParser = MiscUtils.getDomParser();
        // merge default settings with configured ones
        this.settings = MiscUtils.merge(defaultWfsSettings, settings);
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

        this.generalInfo = await this.prepareImport(this.generalInfo, capabilitiesResponseDom, select);

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

    /**
     * generalInfo might need to be adapted to a specific profile; this can be done here
     * 
     * @param generalInfo 
     * @returns 
     */
    async prepareImport(generalInfo: any, capabilitiesDom: Node, select: XPathNodeSelect) {
        return generalInfo;
    }

    async extractFeatures(xml: Document, harvestTime) {
        let promises = [];

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
            this.observer.next(ImportResult.running(++this.numIndexDocs, this.numItems));
        }
        await Promise.all(promises).catch(err => log.error('Error indexing WFS record', err));
    }

    getMapper(settings, feature, harvestTime, summary, generalInfo): WfsMapper {
        return new WfsMapper(settings, feature, harvestTime, summary, generalInfo);
    }

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
