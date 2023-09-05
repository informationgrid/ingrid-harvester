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

import { CswImporter } from '../../../importer/csw/csw.importer';
import { CswMapper } from '../../../importer/csw/csw.mapper';
import { DiplanungCswMapper } from '../mapper/diplanung.csw.mapper';
import { Distribution } from '../../../model/distribution';
import { DOMParser as DomParser } from '@xmldom/xmldom';
import { GeoJsonUtils } from '../../../utils/geojson.utils';
import { Geometry, GeometryCollection, Point } from "@turf/helpers";
import { RequestDelegate } from '../../../utils/http-request.utils';
import { WmsXPath } from './wms.xpath';

const log = require('log4js').getLogger(__filename);

export class DiplanungCswImporter extends CswImporter {

    constructor(settings, requestDelegate?: RequestDelegate) {
        super(settings, requestDelegate);
    }

    getMapper(settings, record, harvestTime, storedData, summary, generalInfo): DiplanungCswMapper {
        return new DiplanungCswMapper(settings, record, harvestTime, storedData, summary, generalInfo);
    }

    protected async postHarvestingHandling() {
        this.createDataServiceCoupling();
    }

    protected async updateRecords(documents: any[]) {
        log.debug('Updating #records:', documents.length);
        let promises: Promise<any>[] = [];
        for (let doc of documents) {
            promises.push(new Promise(async (resolve, reject) => {
                let updateDoc = {
                    _id: doc.identifier
                };
                let docIsUpdated = false;

                // update WMS distributions with layer names
                let updatedDistributions = await this.updateDistributions(doc.distributions);
                if (updatedDistributions?.length > 0) {
                    updateDoc['distributions'] = updatedDistributions;
                    updateDoc['extras'] = { ...doc['extras'] };
                    if (!updateDoc['extras']['metadata']['quality_notes']) {
                        updateDoc['extras']['metadata']['quality_notes'] = [];
                    }
                    updateDoc['extras']['metadata']['is_changed'] = true;
                    updateDoc['extras']['metadata']['quality_notes'].push('WMS layer names have been added to a distribution');
                    docIsUpdated = true;
                }

                // purposely simplistic heuristic: is bbox inside bbox for Germany?
                // FIXME turns out, this heuristic is too simplistic and throws away too much
                if (!this.isExceptionallyLegal(doc.identifier) && !GeoJsonUtils.within(doc.bounding_box, GeoJsonUtils.BBOX_GERMANY)) {
                    // copy and/or create relevant metadata structure
                    updateDoc['extras'] = { ...doc['extras'] };
                    if (!updateDoc['extras']['metadata']['quality_notes']) {
                        updateDoc['extras']['metadata']['quality_notes'] = [];
                    }
                    // if not, try to swap lat and lon
                    let flippedBbox = GeoJsonUtils.flip<Geometry | GeometryCollection>(doc.bounding_box);
                    if (GeoJsonUtils.within(flippedBbox, GeoJsonUtils.BBOX_GERMANY)) {
                        updateDoc['spatial'] = GeoJsonUtils.flip<Geometry | GeometryCollection>(doc.spatial);
                        updateDoc['bounding_box'] = flippedBbox;
                        updateDoc['centroid'] = GeoJsonUtils.flip<Point>(doc.centroid);
                        updateDoc['extras']['metadata']['is_changed'] = true;
                        updateDoc['extras']['metadata']['quality_notes'].push('Swapped lat and lon');
                    }
                    else {
                        updateDoc['extras']['metadata']['is_valid'] = false;
                        updateDoc['extras']['metadata']['quality_notes'].push('Bounding box not within Germany');
                    }
                    docIsUpdated = true;
                }
                // TODO more?

                if (docIsUpdated) {
                    resolve(updateDoc);
                }
                else {
                    reject(`Not updating document ${doc.identifier}`);
                }
            }));
        }
        let results = (await Promise.allSettled(promises)).filter(result => result.status === 'fulfilled');
        let updateDocs = (results as PromiseFulfilledResult<any>[]).map(result => result.value);
        await this.elastic.addDocsToBulkUpdate(updateDocs);
    }

    // this is only used for 0.0.4.1, to ensure the datasets with these UUIDs will be shown in any case
    exceptionallyLegalUuids = [
        "ce398336-d4f6-47be-b0c4-430e0944e1c1",
        "4966a927-1091-4171-8194-e142fd735621",
        "100acb2f-512b-4f66-9935-7ab098faeadd",
        "460ee174-6784-435f-8df7-4a0157b8b1db",
        "3f9bc10c-d31a-4ba4-983f-9c65f68530f6",
        "3ba88a63-7769-4d1a-8c94-caea48b233c9",
        "aee6b48e-060c-428e-8282-9b812cb790e9",
        "51648b62-e588-46ea-96e6-2ef65032e3ec"
    ];
    private isExceptionallyLegal(identifier: string): boolean {
        return this.exceptionallyLegalUuids.includes(identifier.toLowerCase());
    }

    private createDataServiceCoupling() {
        let bulkData = this.elastic._bulkData;
        let servicesByDataIdentifier = [];
        let servicesByFileIdentifier = [];
        for(let i = 0; i < bulkData.length; i++){
            let doc = bulkData[i];
            if(doc.extras){
                let harvestedData = doc.extras.harvested_data;
                let xml = new DomParser().parseFromString(harvestedData, 'application/xml');
                let identifierList = CswMapper.select('.//srv:coupledResource/srv:SV_CoupledResource/srv:identifier/gco:CharacterString', xml)
                if(identifierList && identifierList.length > 0){
                    for(let j = 0; j < identifierList.length; j++){
                        let identifer = identifierList[j].textContent;
                        if(!servicesByDataIdentifier[identifer]){
                            servicesByDataIdentifier[identifer] = [];
                        }
                        servicesByDataIdentifier[identifer] = servicesByDataIdentifier[identifer].concat(doc.distributions);
                    }
                } else {
                    identifierList = CswMapper.select('./gmd:MD_Metadata/gmd:identificationInfo/srv:SV_ServiceIdentification/srv:operatesOn', xml)
                    if (identifierList && identifierList.length > 0) {
                        for (let j = 0; j < identifierList.length; j++) {
                            let identifer = identifierList[j].getAttribute("uuidref")
                            if (!servicesByFileIdentifier[identifer]) {
                                servicesByFileIdentifier[identifer] = [];
                            }
                            servicesByFileIdentifier[identifer] = servicesByFileIdentifier[identifer].concat(doc.distributions);
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
                let identifierList = CswMapper.select('./gmd:MD_Metadata/gmd:identificationInfo/gmd:MD_DataIdentification/gmd:citation/gmd:CI_Citation/gmd:identifier/gmd:MD_Identifier/gmd:code/gco:CharacterString', xml)
                if(identifierList){
                    for(let j = 0; j < identifierList.length; j++){
                        let identifer = identifierList[j].textContent;
                        if(servicesByDataIdentifier[identifer]){
                            doc.distributions = doc.distributions.concat(servicesByDataIdentifier[identifer]);
                        }
                    }
                }
                identifierList = CswMapper.select('./gmd:MD_Metadata/gmd:fileIdentifier/gco:CharacterString', xml)
                if(identifierList){
                    for(let j = 0; j < identifierList.length; j++){
                        let identifer = identifierList[j].textContent;
                        if(servicesByFileIdentifier[identifer]){
                            doc.distributions = doc.distributions.concat(servicesByFileIdentifier[identifer]);
                        }
                    }
                }
            }
        }
    }

    /**
     * Add layer names to all WMS distributions of the given.
     * 
     * @param distributions the distributions to potentially retrieve WMS layer names for
     * @returns all distributions, including the modified ones if any; null, if no distribution was modified
     */
    private async updateDistributions(distributions: Distribution[]): Promise<Distribution[]> {
        let updatedDistributions: Distribution[] = [];
        let updated = false;
        for (let distribution of distributions) {
            // Hamburg Customization -> enrich dataset with WMS Distribution
            let generatedWMS = this.generateWmsDistribution(distribution);
            if (generatedWMS) {
                updatedDistributions.push(generatedWMS);
                updated = true;
            }
            // add layer names for WMS services
            if (distribution.format?.includes('WMS') && distribution.accessURL.includes('GetCapabilities')) {
                try {
                    let response = await RequestDelegate.doRequest({ uri: distribution.accessURL });
                    // surface heuristic for XML
                    if (response.startsWith('<?xml')) {
                        let layerNames = this.getMapLayerNames(response);
                        if (layerNames) {
                            distribution.mapLayerNames = layerNames;
                            updated = true;
                        }
                    }
                    else {
                        let msg = `Response for ${distribution.accessURL} is not valid XML`;
                        log.debug(msg);
                        this.summary.warnings.push([msg, response.replaceAll('\n', ' ')]);
                    }
                }
                catch (err) {
                    log.warn(err.message);
                    this.summary.warnings.push([`Could not get response for ${distribution.accessURL}`, err.message]);
                }
            }
            updatedDistributions.push(distribution);
        }
        return updated ? updatedDistributions : null;
    }

    private generateWmsDistribution(distribution: Distribution): Distribution {
        const url: URL = new URL(distribution.accessURL);
        // check pattern of "geodienste.hamburg.de/HH_WFS_xplan_dls..."
        if(
            url.hostname === "geodienste.hamburg.de" &&
            url.pathname === "/HH_WFS_xplan_dls" &&
            url.searchParams.get('service') === "WFS" &&
            url.searchParams.get('request') === "GetFeature" &&
            url.searchParams.get('version') === "2.0.0" &&
            url.searchParams.get('resolvedepth') === "*" &&
            url.searchParams.get('StoredQuery_ID') === "urn:ogc:def:query:OGC-WFS::PlanName"
        ) {
            // generate WMS Url with PlanName form
            let planName = url.searchParams.get('planName');
            let generatedAccessUrl = "https://hh.xplanungsplattform.de/xplan-wms/services/planwerkwms/planname/" + planName + "?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities";
            return {
                accessURL: generatedAccessUrl,
                format: ["WMS"],
                title: "WMS Bebauungplan"
            };
        }
        return null;
    }

    // private async getWmsResponse(uri: string) {
    //     let qs = {};
    //     if (!uri.toLowerCase().includes('service=wms')) {
    //         qs['service'] = 'WMS';
    //     }
    //     if (!uri.toLowerCase().includes('request=getcapabilities')) {
    //         qs['request'] = 'GetCapabilities';
    //     }
    //     let serviceRequestDelegate = new RequestDelegate({ uri, qs });
    //     return await serviceRequestDelegate.doRequest();
    //     // return await serviceRequestDelegate.doRequest(2, 500);   // retry 2 times, wait 500ms between
    // }

    private getMapLayerNames(response: string): string[] {
        let serviceResponseDom = new DomParser().parseFromString(response, 'application/xml');
        // layer * 2
        let layers = WmsXPath.select('./wms:WMS_Capabilities/wms:Capability/wms:Layer/wms:Layer', serviceResponseDom);
        let layerNames = [];
        for (let layer of layers) {
            let layerName = WmsXPath.select('./wms:Name', layer, true)?.textContent;
            if (layerName) {
                layerNames.push(layerName);
            }
        }
        return layerNames;
    }
}